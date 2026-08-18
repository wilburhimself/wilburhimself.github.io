---
title: "Deploying a Third App to a Crowded Droplet with Kamal"
date: "August 16, 2026"
tags: ["rails", "kamal", "engineering", "infrastructure"]
excerpt: "The droplet had room for a third app. What it didn't have room for was two settings that quietly meant something different to a second subsystem than the one I was tuning."
discussion:
  x: "https://x.com/wilburhimself/status/2089723646348566888"
  linkedin: "https://lnkd.in/p/g8PH_fJg"
---

I have a $12/mo DigitalOcean droplet running two Next.js apps behind nginx. It's not idle: `free -h` shows it's already dipping into swap under normal load. So when I wanted to stand up a Rails app on it for testing, "just deploy it" wasn't really an option. Resizing felt like the obvious fix, but the app was only ever going to see two or three testers at a time, so paying double for headroom I'd almost never use didn't sit right either.

I wasn't really testing whether Kamal could deploy a Rails app. I was testing whether a Rails app could coexist with two existing applications on a machine that was already close to its memory ceiling. It could. The interesting part was what broke along the way. Both breaks trace back to the same shape of mistake: I'd made changes for a bare-IP, no-TLS, low-memory test deploy without fully tracing where else in the app those assumptions leaked.

## The setup

- Droplet: 1.9GB RAM, 1 vCPU, already running `antorchadigital.es` and `prestacrm.com` (both Next.js, both fronted by nginx on 80/443).
- New app: a Rails 8 app (Puma, Postgres, Redis, Solid Queue) with a `Dockerfile` and `config/deploy.yml` already scaffolded for [Kamal](https://kamal-deploy.org/).
- Goal: get it live somewhere testers could hit it, without resizing the droplet or disturbing the other two apps.

Two constraints shaped every decision that followed: don't fight nginx for ports 80/443, and don't let this app's memory footprint threaten the other two.

## Don't fight nginx for the ports

nginx already owned host ports 80 and 443, and Kamal's own reverse proxy, `kamal-proxy`, defaults to binding those same ports. Rather than get two proxies fighting over a socket, I rebound kamal-proxy off to the side:

```
kamal proxy boot_config set --http-port=8080 --https-port=8443
```

That's a one-time, host-level command, not something you put in `deploy.yml` (I tried; Kamal's config validator correctly told me `unknown key: http_port` when I nested it under `proxy:`). With no domain picked yet, I also left `proxy.ssl: false` in `deploy.yml`, so testers hit `http://<droplet-ip>:8080` directly.

(`boot_config` is what set this server up, but current Kamal docs describe the equivalent settings under the proxy `run` configuration; check that if you're reading this more than a few months out.)

## Memory: hard caps were enough

Instead of resizing, I capped every new container's memory explicitly:

```yaml
servers:
  web:
    options:
      memory: 384m

accessories:
  db:
    options:
      memory: 192m
  redis:
    options:
      memory: 80m
```

The logic: a hard `--memory` limit means a runaway container gets OOM-killed *by the kernel, inside its own cgroup*, so it can't balloon and starve the other two apps' processes. Combined with Postgres and Redis running as Kamal accessories on non-default ports (the droplet already had a native Postgres on 5432 for one of the Next.js apps), the new stack was fully isolated: its own containers, its own ports, its own ceiling.

Worst case, the whole new stack could eat about 656MB. That ceiling is enforced per-container by the kernel regardless of what the rest of the host is doing, so a runaway process here couldn't starve the other two apps even in the worst case. In practice it did better than worst case: after deploy, the droplet's used memory grew by roughly 150MB, and swap usage didn't move at all. The hard limits set the blast radius; the actual workload turned out to be well inside it.

## The dangerous part wasn't the hardware

The stack fit: 384 + 192 + 80MB of hard caps, alongside two existing Next.js apps, on 1.9GB of RAM and 1 vCPU total, with room to spare.

What broke was semantic, not physical. I changed two settings for reasons that made complete sense in isolation, and each time the setting meant something else to a system I wasn't thinking about:

```text
Your intention                    Hidden dependency

"Reduce Puma threads"        →    RAILS_MAX_THREADS
                                        ↓
                                   ActiveRecord pool size
                                        ↓
                                   Solid Queue's own connections

"Disable TLS for this test"  →    FORCE_SSL
                                        ↓
                                   session cookie's secure flag
```

Neither `RAILS_MAX_THREADS` nor `FORCE_SSL` did anything wrong; both did exactly what they're documented to do. The problem is that each one was essential to a second thing I wasn't touching on purpose.

## Bug #1: one env var, two unrelated jobs

First deploy went out clean. Health checks passed. Then, a few minutes later, the container was crash-looping.

The logs had the answer immediately:

```
Solid Queue is configured to use 5 threads but the database connection pool is 3.
Increase it in `config/database.yml`
...
Detected Solid Queue has gone away, stopping Puma...
```

Here's what happened. To keep the memory footprint down, I'd set `RAILS_MAX_THREADS=3` in `deploy.yml`. That one variable does two jobs in a stock Rails app:

- `config/puma.rb` uses it to size Puma's thread pool.
- `config/database.yml`'s generated `default` anchor uses the same variable as the default size for **every** ActiveRecord connection pool: `primary`, `cache`, `queue`, and `cable`.

```ruby
pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
```

Set it low for Puma's benefit, and you've also capped every one of those pools at the same number, whether or not that's what any of them actually needed.

Solid Queue wasn't sharing Puma's thread pool. Its workers had their own concurrency (5 threads by default), and those workers also needed database connections of their own. By shrinking the shared, `RAILS_MAX_THREADS`-derived pool down to 3, I'd unknowingly put a ceiling underneath the queue process too. Solid Queue noticed its own thread count no longer fit inside the pool, decided something was wrong, and killed Puma outright. That killed the container's main process, which restarted the container, forever.

The fix was to stop touching it:

```diff
- WEB_CONCURRENCY: 1
- RAILS_MAX_THREADS: 3
- JOB_CONCURRENCY: 1
+ WEB_CONCURRENCY: 1
+ JOB_CONCURRENCY: 1
```

Leaving `RAILS_MAX_THREADS` unset restored Rails' own already-balanced defaults. `WEB_CONCURRENCY: 1` alone was enough to keep memory down; I didn't need to touch thread counts at all.

**The lesson:** when an env var is shared between two subsystems, changing it for one subsystem's benefit is changing it for both. If the same environment variable configures two subsystems, treat it as an interface between them, even if neither subsystem calls it that.

## Bug #2: the cookie that would not set

With the crash loop fixed, the app served requests fine. But nobody could log in. Every submission of the login form came back `422 Unprocessable Content`, with `Can't verify CSRF token authenticity` in the logs.

The first instinct, a bad CSRF token in my test script, was wrong. `curl -D -` on the login page's response showed the real problem: **no `Set-Cookie` header at all**, on any request, ever. No cookie, no session, no way for the CSRF token generated on the GET to still be around by the time the POST arrived.

The cause traced back to a change I'd made earlier for the same reason as the proxy rebind: this test deploy has no domain and no TLS in front of it, so I'd set `FORCE_SSL=false` to stop Rails from redirect-looping every request to a `https://` that didn't exist. But `config/initializers/session_store.rb` had:

```ruby
Rails.application.config.session_store :cache_store,
  key: "_food_distribution_session",
  secure: Rails.env.production?,
  ...
```

`RAILS_ENV` was still `production`; only the *transport* had changed, not the environment name. So the session cookie was still configured `secure: true`, on a connection that was plain HTTP.

Here's what I actually observed, working backward from the symptom:

```text
HTTP request
    ↓
no Set-Cookie header, on any request, ever
    ↓
no session
    ↓
CSRF token from the GET never survives to the POST
```

The important distinction wasn't `production` versus `development`. It was HTTPS versus HTTP. I'd encoded the former into a setting, `secure: Rails.env.production?`, that really depended on the latter, using environment identity as a proxy for transport security. Those two normally correlate. They weren't correlated in this deployment.

The fix tied the cookie's `secure` flag to the same source of truth as the SSL toggle, instead of the environment name:

```diff
- secure: Rails.env.production?,
+ secure: ENV.fetch("FORCE_SSL", "true") == "true",
```

Once that shipped, `Set-Cookie` showed up right where it should, the CSRF token survived between requests, and login worked.

That fix isn't quite clean, though, and here's why. `FORCE_SSL` answers "should Rails enforce TLS on this deploy"; "should this cookie carry the `Secure` flag" happens to have the same answer here, but it's not the same question, and coupling them again is exactly the shape of implicit dependency that caused Bug #1. The first fix removed an implicit coupling by deleting a shared setting. The second fix, as written, risks quietly creating another one. If this deploy shape outlives the test, the more honest name is something like `COOKIE_SECURE`, set independently of whatever `FORCE_SSL` happens to be:

```ruby
secure: ENV.fetch("COOKIE_SECURE", "true") == "true"
```

For a temporary, TLS-less test deploy, reusing `FORCE_SSL` was a fine shortcut. As a permanent pattern, it isn't.

**The lesson:** `Rails.env.production?` answers "what environment am I configured as," not "is this connection actually encrypted." Those two questions happen to have the same answer in a normal deploy, which is exactly what makes it easy to reach for the wrong one, and exactly why it stays invisible until you deliberately run production without TLS, which most people never do.

## What I'd tell past-me

Both bugs came from the same shape of mistake: changing one thing for one reason, without tracing every other place that same thing was silently relied on. `RAILS_MAX_THREADS` and `Rails.env.production?` both look like single-purpose settings. Neither is. The fix in both cases was small, a one-line diff, but finding it meant reading the actual log output and the actual response headers rather than guessing from the symptom.

If you're doing something similar, squeezing a Rails app onto a droplet that's already got other things running on it, here's the checklist that would've saved me the debugging time:

- If you're running Solid Queue inside Puma, don't let anything shrink the AR connection pool below what Solid Queue's dispatcher + worker threads need. Leave `RAILS_MAX_THREADS` alone unless you've checked both call sites.
- If you're disabling `force_ssl` for a TLS-less test deploy, grep the codebase for `secure: true` (or anything derived from `Rails.env.production?`) on cookies: session store, any manually-set cookies, remember-me tokens, all of it.
- If the workload is small, consider container memory limits before resizing the host. In this case, the limits gave the new app a bounded blast radius without affecting the existing applications.
- Kamal's own proxy will happily coexist with an existing nginx setup, as long as you rebind it off 80/443 with `kamal proxy boot_config set` before the first deploy.

None of these problems required a Kamal bug or a Rails bug. They came from combining reasonable defaults in a deployment shape those defaults weren't designed to describe explicitly: production Rails, behind an existing proxy, without TLS, sharing a memory-constrained host with other applications.

The dangerous class of infrastructure bug isn't a broken component. It's an invariant nobody wrote down.
