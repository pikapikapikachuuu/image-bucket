/* eslint-env mocha */
const td = require('testdouble')
td.config({
  ignoreWarnings: true
})

const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.config.includeStack = true
const should = chai.should()

describe('S3 Bucket Lifter', () => {
  let AWS
  let Lifter

  before(() => {
    AWS = td.object(['config'])
    AWS.config.loadFromPath = td.function()
    AWS.S3 = td.constructor(['createBucket', 'deleteBucket', 'putObject', 'getObject', 'deleteObject', 'listObjects'])
  })

  beforeEach(() => {
    td.replace('aws-sdk', AWS)
    Lifter = require('../lib/lifter')
  })

  afterEach(() => td.reset())

  describe('when constructing', () => {
    it('should configure AWS access', () => {
      const lifter = new Lifter()
      td.verify(AWS.config.loadFromPath(td.matchers.anything()), { times: 1 })
    })
  })

  describe('when creating a bucket', () => {
    beforeEach(() => {
      td.when(AWS.S3.prototype.createBucket({ Bucket: 'test-bucket' })).thenReturn({
        promise: td.when(td.function()()).thenResolve({ status: 200 })
      })
    })

    it('should call AWS.S3.createBucket and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter.createBucket('test-bucket')
      await td.verify(AWS.S3.prototype.createBucket(td.matchers.anything()), { times: 1 })
      result.status.should.be.equal(200)
    })
  })

  describe('when deleting a bucket', () => {
    beforeEach(() => {
      td.when(AWS.S3.prototype.deleteBucket({ Bucket: 'test-bucket' })).thenReturn({
        promise: td.when(td.function()()).thenResolve({ status: 200 })
      })
    })

    it('should call AWS.S3.deleteBucket and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter.deleteBucket('test-bucket')
      await td.verify(AWS.S3.prototype.deleteBucket(td.matchers.anything()), { times: 1 })
      result.status.should.be.equal(200)
    })
  })
})
