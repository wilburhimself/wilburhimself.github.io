import React from 'react'
import Layout from '../components/Layout'
import SEO from '../components/seo'
import { rhythm } from '../utils/typography'
import { Link, graphql } from 'gatsby'

class About extends React.Component {
  render () {
    const { data } = this.props
    const siteTitle = data.site.siteMetadata.title
    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title="About Wilbur Suero"
          keywords={[`blog`, `Wilbur Suero`, `javascript`, `react`]}
        />
        <div>
          <h3
            style={{
              marginBottom: rhythm(1 / 4),
            }}
          >
            About
          </h3>

          <p>I'm Wilbur Suero. I go by wilburhimself online. I have been writing here for many years, much more than what the current archive on this site reflects.</p>
          <p>I have been part of software and advertising companies in the United States and in Europe. I've been part of advertising campaigns, non-profit organizations, customer service applications, tourism and a variety of open source projects.</p>
          <p>I live in La Romana, Dominican Republic with my wife, Jennifer Núñez and our two children. I am interested in programming, the rights and welfare of animals, music, arts and systems of all kinds. I like to discuss varied topics with my friends, play guitar, spend time outdoors, and praying.</p>

          <p>You can find out more about me in <a href="https://github.com/wilburhimself">Github</a>, <a href="https://twitter.com/wilburhimself">Twitter</a>, <a href="https://www.linkedin.com/in/wilbursuero/">Linkedin</a> or you can <a href="mailto:wilbursuero@me.com">send me an email</a>.</p>
        </div>
      </Layout>
    )
  }
}

export default About

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`

