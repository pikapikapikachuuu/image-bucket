const Lifter = require('./lib/lifter')

const lifter = new Lifter()
lifter.upToCloud(process.argv[2], 'webcompressionproxy', 'screenshots')
