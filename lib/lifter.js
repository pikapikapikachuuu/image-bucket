const AWS = require('aws-sdk')
const _ = require('lodash')
const path = require('path')
const fs = require('fs')
const { promisify } = require('util')

class BucketLifter {
  constructor () {
    AWS.config.loadFromPath('./config.json')
    this._s3 = new AWS.S3()
  }

  async _createBucket (bucket) {
    return this._s3.createBucket({ Bucket: bucket }).promise()
  }

  async _deleteBucket (bucket) {
    return this._s3.deleteBucket({ Bucket: bucket }).promise()
  }

  async _putObject (bucket, key, data) {
    return this._s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: data,
      ACL: 'public-read'
    }).promise()
  }

  async _getObject (bucket, key) {
    return this._s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise()
  }

  async _deleteObject (bucket, key) {
    return this._s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise()
  }

  async _listObjects (bucket, maxKeys = 1000) {
    let objects = []

    const listObjectTrunks = async (params) => {
      const data = await this._s3.listObjects(params).promise()
      const extracts = _.flatMap(data.Contents, d => d.Key)
      objects = [...objects, ...extracts]

      if (data.IsTruncated) {
        if (data.NextMarker) {
          params.Marker = data.NextMarker
        } else {
          params.Marker = data.Contents[data.Contents.length - 1].Key
        }
      }

      await listObjectTrunks(params)
    }

    await listObjectTrunks({
      Bucket: bucket,
      MaxKeys: maxKeys
    })
    return objects
  }

  async upToCloud (siloPath, bucket) {
    const readdirAsync = promisify(fs.readdir)
    const _readFileAsync = promisify(fs.readFile)

    const silo = await readdirAsync(siloPath)

    silo.forEach(async (cell) => {
      const cellPath = path.join(siloPath, cell)
      const shots = await readdirAsync(cellPath)

      shots.forEach(async (shot) => {
        const shotPath = path.join(cellPath, shot)
        try {
          const key = shotPath.split(path.sep).join('/')
          const data = await _readFileAsync(shotPath)
          await this.putObject(bucket, key, data)
        } catch (error) {
          console.log(error)
        }
      })
    })
  }
}

module.exports = BucketLifter
