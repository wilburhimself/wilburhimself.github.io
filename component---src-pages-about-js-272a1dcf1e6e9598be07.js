(window.webpackJsonp=window.webpackJsonp||[]).push([[4],{146:function(e,t,n){"use strict";n.r(t),n.d(t,"pageQuery",function(){return d});var a=n(7),r=n.n(a),i=n(0),o=n.n(i),s=n(154),c=n(155),u=n(151),l=(n(150),function(e){function t(){return e.apply(this,arguments)||this}return r()(t,e),t.prototype.render=function(){var e=this.props.data.site.siteMetadata.title;return o.a.createElement(s.a,{location:this.props.location,title:e},o.a.createElement(c.a,{title:"About Wilbur Suero",keywords:["blog","Wilbur Suero","javascript","react"]}),o.a.createElement("div",null,o.a.createElement("h3",{style:{marginBottom:Object(u.a)(.25)}},"About"),o.a.createElement("p",null,"I'm Wilbur Suero. I go by wilburhimself online. I have been writing here for many years, much more than what the current archive on this site reflects."),o.a.createElement("p",null,"I have been part of software and advertising companies in the United States and in Europe. I've been part of advertising campaigns, non-profit organizations, customer service applications, tourism and a variety of open source projects."),o.a.createElement("p",null,"I live in La Romana, Dominican Republic with my wife, Jennifer Núñez and our two children. I am interested in programming, the rights and welfare of animals, music, arts and systems of all kinds. I like to discuss varied topics with my friends, play guitar, spend time outdoors, and praying."),o.a.createElement("p",null,"You can find out more about me in ",o.a.createElement("a",{href:"https://github.com/wilburhimself"},"Github"),", ",o.a.createElement("a",{href:"https://twitter.com/wilburhimself"},"Twitter"),", ",o.a.createElement("a",{href:"https://www.linkedin.com/in/wilbursuero/"},"Linkedin")," or you can ",o.a.createElement("a",{href:"mailto://wilbursuero@me.com"},"send me an email"),".")))},t}(o.a.Component));t.default=l;var d="1097489062"},150:function(e,t,n){"use strict";n.r(t),n.d(t,"graphql",function(){return h}),n.d(t,"StaticQueryContext",function(){return m}),n.d(t,"StaticQuery",function(){return p});var a=n(0),r=n.n(a),i=n(4),o=n.n(i),s=n(149),c=n.n(s);n.d(t,"Link",function(){return c.a}),n.d(t,"withPrefix",function(){return s.withPrefix}),n.d(t,"navigate",function(){return s.navigate}),n.d(t,"push",function(){return s.push}),n.d(t,"replace",function(){return s.replace}),n.d(t,"navigateTo",function(){return s.navigateTo});var u=n(152),l=n.n(u);n.d(t,"PageRenderer",function(){return l.a});var d=n(33);n.d(t,"parsePath",function(){return d.a});var m=r.a.createContext({}),p=function(e){return r.a.createElement(m.Consumer,null,function(t){return e.data||t[e.query]&&t[e.query].data?(e.render||e.children)(e.data?e.data.data:t[e.query].data):r.a.createElement("div",null,"Loading (StaticQuery)")})};function h(){throw new Error("It appears like Gatsby is misconfigured. Gatsby related `graphql` calls are supposed to only be evaluated at compile time, and then compiled away,. Unfortunately, something went wrong and the query was left in the compiled code.\n\n.Unless your site has a complex or custom babel/Gatsby configuration this is likely a bug in Gatsby.")}p.propTypes={data:o.a.object,query:o.a.string.isRequired,render:o.a.func,children:o.a.func}},151:function(e,t,n){"use strict";n.d(t,"a",function(){return c}),n.d(t,"b",function(){return u});var a=n(157),r=n.n(a),i=n(158),o=n.n(i);o.a.overrideThemeStyles=function(){return{"a.gatsby-resp-image-link":{boxShadow:"none"}}},delete o.a.googleFonts;var s=new r.a(o.a);var c=s.rhythm,u=s.scale},152:function(e,t,n){var a;e.exports=(a=n(153))&&a.default||a},153:function(e,t,n){"use strict";n.r(t);n(32);var a=n(0),r=n.n(a),i=n(4),o=n.n(i),s=n(52),c=n(2),u=function(e){var t=e.location,n=c.default.getResourcesForPathnameSync(t.pathname);return r.a.createElement(s.a,Object.assign({location:t,pageResources:n},n.json))};u.propTypes={location:o.a.shape({pathname:o.a.string.isRequired}).isRequired},t.default=u},154:function(e,t,n){"use strict";n(32);var a=n(7),r=n.n(a),i=n(0),o=n.n(i),s=n(150),c=n(151),u=function(e){function t(){return e.apply(this,arguments)||this}return r()(t,e),t.prototype.render=function(){var e,t=this.props,n=t.location,a=t.title,r=t.children;return e="/"===n.pathname?o.a.createElement("h1",{style:Object.assign({},Object(c.b)(1.5),{marginBottom:Object(c.a)(1.5),marginTop:0})},o.a.createElement(s.Link,{style:{boxShadow:"none",textDecoration:"none",color:"inherit"},to:"/"},a)):o.a.createElement("h3",{style:{fontFamily:"Montserrat, sans-serif",marginTop:0,marginBottom:Object(c.a)(-1)}},o.a.createElement(s.Link,{style:{boxShadow:"none",textDecoration:"none",color:"inherit"},to:"/"},a)),o.a.createElement("div",{style:{marginLeft:"auto",marginRight:"auto",maxWidth:Object(c.a)(24),padding:Object(c.a)(1.5)+" "+Object(c.a)(.75)}},e,r,o.a.createElement("footer",null,"© 2018, Built with ",o.a.createElement("a",{href:"https://www.gatsbyjs.org"},"Gatsby")))},t}(o.a.Component);t.a=u},155:function(e,t,n){"use strict";var a=n(156),r=n(0),i=n.n(r),o=n(4),s=n.n(o),c=n(159),u=n.n(c),l=n(150);function d(e){var t=e.description,n=e.lang,r=e.meta,o=e.keywords,s=e.title;return i.a.createElement(l.StaticQuery,{query:m,render:function(e){var a=t||e.site.siteMetadata.description;return i.a.createElement(u.a,{htmlAttributes:{lang:n},title:s,titleTemplate:"%s | "+e.site.siteMetadata.title,meta:[{name:"description",content:a},{property:"og:title",content:s},{property:"og:description",content:a},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"},{name:"twitter:creator",content:e.site.siteMetadata.author},{name:"twitter:title",content:s},{name:"twitter:description",content:a}].concat(o.length>0?{name:"keywords",content:o.join(", ")}:[]).concat(r)})},data:a})}d.defaultProps={lang:"en",meta:[],keywords:[]},d.propTypes={description:s.a.string,lang:s.a.string,meta:s.a.array,keywords:s.a.arrayOf(s.a.string),title:s.a.string.isRequired},t.a=d;var m="1025518380"},156:function(e){e.exports={data:{site:{siteMetadata:{title:"Rants & Ramblings",description:"Rants and ramblings about life and code.",author:"Wilbur Suero"}}}}}}]);
//# sourceMappingURL=component---src-pages-about-js-272a1dcf1e6e9598be07.js.map