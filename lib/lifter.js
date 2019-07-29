const AWS = require('aws-sdk')
const Brakes = require('brakes')
const retry = require('retry-as-promised')
const _ = require('lodash')
const path = require('path')
const fs = require('fs')
const { promisify } = require('util')

class BucketLifter {
  constructor () {
    AWS.config.loadFromPath('./config.json')
    this._s3 = new AWS.S3()

    this._options = {
      breaker: {
        timeout: 100000,
        threshold: 80
      },
      retry: {
        max: 3,
        timeout: 30000
      }
    }

    this._circuitBreaker = new Brakes(this._options.breaker)

    this._s3.createBucketCircuitBreaker = this._circuitBreaker.slaveCircuit((params) => retry(() => this._s3.createBucket(params).promise(), this._options.retry))
    this._s3.deleteBucketCircuitBreaker = this._circuitBreaker.slaveCircuit((params) => retry(() => this._s3.deleteBucket(params).promise(), this._options.retry))
    this._s3.putObjectCircuitBreaker = this._circuitBreaker.slaveCircuit((params) => retry(() => this._s3.putObject(params).promise(), this._options.retry))
    this._s3.getObjectCircuitBreaker = this._circuitBreaker.slaveCircuit((params) => retry(() => this._s3.getObject(params).promise(), this._options.retry))
    this._s3.deleteObjectCircuitBreaker = this._circuitBreaker.slaveCircuit((params) => retry(() => this._s3.deleteObject(params).promise(), this._options.retry))
    this._s3.listObjectsCircuitBreaker = this._circuitBreaker.slaveCircuit((params) => retry(() => this._s3.listObjects(params).promise(), this._options.retry))
  }

  async _createBucket (bucket) {
    return this._s3.createBucketCircuitBreaker.exec({ Bucket: bucket })
  }

  async _deleteBucket (bucket) {
    return this._s3.deleteBucketCircuitBreaker.exec({ Bucket: bucket })
  }

  async _putObject (bucket, key, data) {
    return this._s3.putObjectCircuitBreaker.exec({
      Bucket: bucket,
      Key: key,
      Body: data,
      ACL: 'public-read'
    })
  }

  async _getObject (bucket, key) {
    return this._s3.getObjectCircuitBreaker.exec({
      Bucket: bucket,
      Key: key
    })
  }

  async _deleteObject (bucket, key) {
    return this._s3.deleteObjectCircuitBreaker.exec({
      Bucket: bucket,
      Key: key
    })
  }

  async _listObjects (bucket, prefix, maxKeys = 1000, callback) {
    let objects = []

    const listObjectTrunks = async (params) => {
      const data = await this._s3.listObjectsCircuitBreaker.exec(params)
      const extracts = _.flatMap(data.Contents, d => d.Key)
      objects = [...objects, ...extracts]

      if (data.IsTruncated) {
        if (data.NextMarker) {
          params.Marker = data.NextMarker
        } else {
          params.Marker = data.Contents[data.Contents.length - 1].Key
        }
        await listObjectTrunks(params)
      }
    }

    await listObjectTrunks({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
      Delimiter: '/'
    })
    return objects
  }

  async upToCloud (siloPath, bucket, prefix) {
    const readdirAsync = promisify(fs.readdir)
    const _readFileAsync = promisify(fs.readFile)

    const silo = await readdirAsync(siloPath)

    silo.forEach(async (cell) => {
      const cellPath = path.join(siloPath, cell)
      const shots = await readdirAsync(cellPath)

      shots.forEach(async (shot) => {
        const shotPath = path.join(cellPath, shot)
        try {
          const key = prefix + '/' + path.relative(siloPath, shotPath).split(path.sep).join('/')
          await this._s3.waitFor('objectNotExists', { Bucket: bucket, Key: key }).promise()
          const data = await _readFileAsync(shotPath)
          await this._putObject(bucket, key, data)
        } catch (error) {
          console.log(shotPath, error.message)
        }
      })
    })
  }

  async dumpObjectUrls (bucket, prefix, filePath) {

  }
}

module.exports = BucketLifter
