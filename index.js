const path = require('path')
const fs = require('fs')
const { promisify } = require('util')

const Lifter = require('./lib/lifter')

const lifter = new Lifter()

const upToCloud = async (siloPath, bucket) => {
  const _readdirAsync = promisify(fs.readdir)
  const _readFileAsync = promisify(fs.readFile)

  const silo = await _readdirAsync(siloPath)

  silo.forEach(async (cell) => {
    const cellPath = path.join(siloPath, cell)
    const shots = await _readdirAsync(cellPath)

    shots.forEach(async (shot) => {
      const shotPath = path.join(cellPath, shot)
      try {
        const key = shotPath.split(path.sep).join('/')
        const data = await _readFileAsync(shotPath)
        await lifter.putObject(bucket, key, data)
      } catch (error) {
        console.log(error)
      }
    })
  })
}

upToCloud('./screenshots', 'webcompressionproxy')
