---
title: Automating conventional commit messages globally
date: '2019-03-17T01:00:00.121Z'
---

I am always looking for ways to make me a better developer. This not only includes coding and programming skills, but also improving  the process of coding and automating and streamlining my ways around these processes. One area I have vastly improved is my writing of commit messages.

One bad habit one usualy takes as a solo developer or under time constraints is to ignore documentation. Missing documentation is not important until it is, then, it is really important.

That's one area I'm trying to improve in. Good commit messages are a most often ignored form of documentation, so how do we improve them? I have been reading [how to write a good commit message](https://chris.beams.io/posts/git-commit/), it makes sense and it's easy to follow and got me where I wanted as far as commit messages matter.

However I became aware about [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0-beta.3/) thanks to [Enhance your git log with conventional commits](https://dev.to/maxpou/enhance-your-git-log-with-conventional-commits-3ea4). I really liked the article and started writting conventional commits by hand for the last couple of days.

I wanted to automate the enforcing of commit messages automatically in all my projects. I googled and found the tools I needed to set it up globally for all commit messages:

- [Commitizen](https://github.com/commitizen/cz-cli) helps writing the conventional commit message
- [Commitlint](https://github.com/conventional-changelog/commitlint) check each commit for proper format
- [Git global hooks](https://til.hashrocket.com/posts/c89a35a66c-global-git-hooks) fail if the commit message is not properly formatted

### Commitizen

[Commitizen](https://github.com/commitizen/cz-cli) is a handy script that prompts and builds the parts of a conventional commit message.

The first step is to install it: (taken from their README)
```
npm install -g commitizen
```

Install your prefered commitizen adapter globally, for example `cz-conventional-changelog`

```
npm install -g cz-commitizen-changelog
```

Create a `.czrc` file with the path of the commitizen adapter

```
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc
```

After Commitizen has been installed instead of using `git commit`, you create a commit using `git cz`.
