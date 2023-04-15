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

          <p>I am Wilbur Suero, a seasoned software engineer with years of experience in both the US and Europe. Throughout my career, I have contributed to the development of software for advertising campaigns, non-profit organizations, customer service applications, tourism, and various open source projects.</p>
          <p>My passion for programming has led me to pursue diverse interests, such as systems design and architecture, which have broadened my knowledge and expertise in the field. I am constantly striving to stay updated on the latest advancements in technology, ensuring that I can deliver top-notch solutions for any project I undertake.</p>
          <p>I currently reside in La Romana, Dominican Republic. When I am not working on software development projects, I enjoy pursuing my other interests, such as music and the arts. In my free time, I enjoy engaging in intellectual discussions with friends and spending time outdoors.</p>
          <p>Thank you for taking the time to visit my website. I look forward to the opportunity to collaborate with you on any project you may have.</p>

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

