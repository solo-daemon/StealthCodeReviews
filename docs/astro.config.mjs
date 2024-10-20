import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://solo-daemon.github.io/StealthCodeReviews/',
  base: '/StealthCodeReviews',
  integrations: [starlight({
    title: 'Stealth Code Reviews',
    logo: {
      src: './src/assets/stealth-code-reviews-logo.png'
    },
    social: {
      github: 'https://github.com/solo-daemon/StealthCodeReviews'
    },
    sidebar: [{
      label: '[home] Home',
      link: '/'
    },
      {
      label: '[box] Project Parts',
      autogenerate: {
        directory: 'TechSpecs'
      }
    }, {
      label: '[book] Reference',
      autogenerate: {
        directory: 'Reference'
      }
    }],
    components: {
      ThemeProvider: './src/components/ThemeProvider.astro',
      ThemeSelect: './src/components/ThemeSelect.astro',
      SiteTitle: './src/components/SiteTitle.astro',
      Sidebar: './src/components/Sidebar.astro',
      Pagination: './src/components/Pagination.astro',
      Hero: './src/components/Hero.astro',
      Head: './src/components/Head.astro',
      PageTitle: './src/components/PageTitle.astro'
    },
    customCss: [
      '@fontsource-variable/space-grotesk/index.css',
      '@fontsource/space-mono/400.css',
      '@fontsource/space-mono/700.css',
      './src/styles/theme.css'
    ],
    expressiveCode: {
      themes: ['github-dark']
    },
    pagination: false,
    lastUpdated: true
  })],
  output: "static"
});