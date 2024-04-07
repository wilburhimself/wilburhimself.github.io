import React from 'react'
import { Link } from 'gatsby'

import { rhythm, scale } from '../utils/typography'

class Layout extends React.Component {
  render() {
    const { location, title, children } = this.props
    const rootPath = `${__PATH_PREFIX__}/`
    const date = new Date();
    let header

    if (location.pathname === rootPath) {
      header = (
        <h1
          style={{
            ...scale(.8),
            marginBottom: rhythm(1.5),
            marginTop: 0,
          }}
        >
          <Link
            style={{
              boxShadow: `none`,
              textDecoration: `none`,
              color: `inherit`,
            }}
            to={`/`}
          >
            {title}
          </Link>
        </h1>
      )
    } else {
      header = (
        <h3
          style={{
            fontFamily: `Montserrat, sans-serif`,
            marginTop: 0,
            marginBottom: rhythm(-1),
          }}
        >
          <Link
            style={{
              boxShadow: `none`,
              textDecoration: `none`,
              color: `inherit`,
            }}
            to={`/`}
          >
            {title}
          </Link>
        </h3>
      )
    }
    return (
      <div
        style={{
          marginLeft: `auto`,
          marginRight: `auto`,
          maxWidth: rhythm(24),
          padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
        }}
      >
        {header}
        {children}
        <footer style={{
          borderTop: '1px solid #ccc',
          paddingTop: '2em'
        }}>
          Ready to bring your software vision to life? Let's collaborate!<br />
          <a href="https://calendly.com/suerowilbur/30min" target="_blank" rel="noopener noreferrer">Schedule a consultation</a> to discuss your project requirements.<br />
          Alternatively, you can <a href="mailto:suerowilbur@gmail.com" target="_blank" rel="noopener noreferrer">send me an email</a> directly.<br />


            Stay connected and explore my work further: <a href="https://read.cv/wilbursuero" target="_blank" rel="noopener noreferrer">Read CV</a> | <a href="https://github.com/wilburhimself" target="_blank" rel="noopener noreferrer">GitHub</a> | <a href="https://linkedin.com/in/wilbursuero" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </footer>
      </div>
    )
  }
}

export default Layout
