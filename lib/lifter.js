const AWS = require('aws-sdk')

class BucketLifter {
  constructor () {
    AWS.config.loadFromPath('./config.json')
    this._s3 = new AWS.S3()
  }

  async createBucket (bucket) {
    return this._s3.createBucket({ Bucket: bucket }).promise()
  }

  async deleteBucket (bucket) {
    return this._s3.deleteBucket({ Bucket: bucket }).promise()
  }

  async putObject (bucket, key, data) {
    await this._s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: data
    }).promise()
  }

  async getObject (bucket, key) {
    return this._s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise()
  }

  async deleteObject (bucket, key) {
    return this._s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise()
  }

  async listObjects (bucket, maxKeys = 1000) {
    let objects = []

    const _listObjects = async (params) => {
      const data = await this._s3.listObjects(params).promise()
      const extracts = data.Contents.flapMap(_ => _.Key)
      objects = [...objects, ...extracts]

      if (data.IsTruncated) {
        if (data.NextMarker) {
          params.Marker = data.NextMarker
        } else {
          params.Marker = data.Contents[data.Contents.length - 1].Key
        }
      }

      await _listObjects(params)
    }

    return _listObjects({
      Bucket: bucket,
      MaxKeys: maxKeys
    }).promise()
  }
}

module.exports = BucketLifter
