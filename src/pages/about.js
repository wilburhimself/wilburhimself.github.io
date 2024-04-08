import React from 'react'
import Layout from '../components/Layout'
import SEO from '../components/seo'
import { rhythm } from '../utils/typography'
import { Link, graphql } from 'gatsby'
import '../../static/style.css'

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

          <p>As an experienced Full-Stack Software Engineer with a proven track record of delivering cutting-edge solutions
            across diverse industries, I specialize in leveraging the power of Ruby on Rails, JavaScript, and modern web development
             technologies to drive business growth and operational excellence.</p>

          <h4>Technical Proficiency:</h4>
          <ul>
            <li>Ruby on Rails</li>
            <li>JavaScript (React, Vue.js, Node.js)</li>
            <li>Microservices Architecture</li>
            <li>Cloud Computing (AWS, Heroku)</li>
            <li>Containerization (Docker)</li>
            <li>Agile Methodologies</li>
            <li>Database Technologies (PostgreSQL, MongoDB, MySQL)</li>
          </ul>

          <p>With a career spanning over a decade, I have played pivotal roles in developing innovative software for advertising campaigns, non-profit organizations, customer service applications, the home inspection industry, and the tourism sector. From leading product development initiatives for CRM platforms to implementing secure payment gateways and streamlining member acquisition processes through microservices architecture, my expertise lies in architecting scalable, high-performance solutions that exceed client expectations.</p>

          <h4>What Sets Me Apart:</h4>
          <ul>
            <li>Proven ability to troubleshoot complex technical issues and provide prompt resolutions, ensuring uninterrupted service delivery.</li>
            <li>Expertise in implementing cutting-edge technologies, such as machine learning and GraphQL, to enhance operational efficiency and drive user engagement.</li>
            <li>Dedication to fostering a culture of excellence and continuous improvement through mentorship and collaboration with cross-functional teams.</li>
            <li>Unwavering commitment to staying up-to-date with the latest advancements in technology, enabling me to deliver innovative and future-proof solutions.</li>
          </ul>

          <p>Based in La Romana, Dominican Republic, I am available for remote collaboration or on-site consultations to bring your software vision to life.</p>

          <h4>Let's Build Something Remarkable Together</h4>

          <p>Whether you're seeking to optimize your existing software infrastructure, develop a new application, or explore the potential of emerging technologies, I am eager to collaborate with you. Schedule a consultation today, and let's discuss how we can leverage my expertise to propel your business to new heights.</p>

          <p>When I'm not immersed in code, you can find me indulging in my love for music, art, and engaging intellectual discussions with fellow enthusiasts.</p>

          <p>Take the first step towards transforming your business by contacting me today.</p>
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

