module.exports = {
    // options...
    productionSourceMap : false,
    runtimeCompiler: true,

    outputDir: 'statics',

    devServer: {
          host: 'localhost',
          port: '8080'
      },

    chainWebpack: (config) => {
      config.plugins.delete ('prefetch')
    },

    configureWebpack: {
      optimization: {
        splitChunks: {
          minSize: 200000,
        }
      }
    },
    pluginOptions: {
      prerenderSpa: {
        registry: undefined,
        renderRoutes: [
          '/',
          '/all_features',
          '/feature/advanced-search',
          '/feature/advanced-sponsorship',
          '/feature/chat-at-the-event',
          '/feature/content-creation-of-the-event',
          '/feature/agenda',
          '/feature/custom-field',
          '/feature/event-customisation',
          '/feature/event-permissions-management',
          '/feature/inhouse-broadcast',
          '/feature/booths-and-stands',
          '/feature/setup-meetings',
          '/feature/streaming-integrations',
          '/how-it-works',
          '/add-event',
          '/about-us',
          '/faq',
          '/terms-conditions',
          '/privacy-policy',
          '/online-event-management',
          '/conference-organization',
          '/contact',
          '/solutions',
          '/solutions/virtual-conference',
          '/solutions/virtual-workshop',
          '/solutions/advanced-webinar',
          '/solutions/online-exhibition',
          '/solutions/virtual-festival-platform',
          '/partners',
          '/discount'
        ],
        useRenderEvent: true,
        headless: true,
        onlyProduction: true,
        maxConcurrentRoutes: 10
      },
      moment: {
        locales: ['en']
      }
    }
}
