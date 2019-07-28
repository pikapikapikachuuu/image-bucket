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
        promise: td.when(td.function()()).thenResolve({ Status: 200 })
      })
    })

    it('should call AWS.S3.createBucket and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter._createBucket('test-bucket')

      td.verify(AWS.S3.prototype.createBucket(td.matchers.anything()), { times: 1 })

      result.Status.should.be.equal(200)
    })
  })

  describe('when deleting a bucket', () => {
    beforeEach(() => {
      td.when(AWS.S3.prototype.deleteBucket({ Bucket: 'test-bucket' })).thenReturn({
        promise: td.when(td.function()()).thenResolve({ Status: 200 })
      })
    })

    it('should call AWS.S3.deleteBucket and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter._deleteBucket('test-bucket')

      td.verify(AWS.S3.prototype.deleteBucket(td.matchers.anything()), { times: 1 })

      result.Status.should.be.equal(200)
    })
  })

  describe('when putting an object', () => {
    beforeEach(() => {
      td.when(AWS.S3.prototype.putObject(td.matchers.argThat((args) => Object.keys(args).length >= 3))).thenReturn({
        promise: td.when(td.function()()).thenResolve({ Status: 200 })
      })
    })

    it('should call AWS.S3.putObject and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter._putObject('test-bucket', 'test-key', 'test-data')

      const captor = td.matchers.captor()
      td.verify(AWS.S3.prototype.putObject(captor.capture()), { times: 1 })
      captor.value.Bucket.should.be.equal('test-bucket')
      captor.value.Key.should.be.equal('test-key')
      captor.value.Body.should.be.equal('test-data')

      result.Status.should.be.equal(200)
    })
  })

  describe('when getting an object', () => {
    beforeEach(() => {
      td.when(AWS.S3.prototype.getObject(td.matchers.argThat((args) => Object.keys(args).length === 2))).thenReturn({
        promise: td.when(td.function()()).thenResolve({ Status: 200, Body: 'test-data' })
      })
    })

    it('should call AWS.S3.getObject and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter._getObject('test-bucket', 'test-key')

      const captor = td.matchers.captor()
      td.verify(AWS.S3.prototype.getObject(captor.capture()), { times: 1 })
      captor.value.Bucket.should.be.equal('test-bucket')
      captor.value.Key.should.be.equal('test-key')

      result.Status.should.be.equal(200)
      result.Body.should.be.equal('test-data')
    })
  })

  describe('when deleting an object', () => {
    beforeEach(() => {
      td.when(AWS.S3.prototype.deleteObject(td.matchers.argThat((args) => Object.keys(args).length === 2))).thenReturn({
        promise: td.when(td.function()()).thenResolve({ Status: 200 })
      })
    })

    it('should call AWS.S3.deleteObject and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter._deleteObject('test-bucket', 'test-key')

      const captor = td.matchers.captor()
      td.verify(AWS.S3.prototype.deleteObject(captor.capture()), { times: 1 })
      captor.value.Bucket.should.be.equal('test-bucket')
      captor.value.Key.should.be.equal('test-key')

      result.Status.should.be.equal(200)
    })
  })

  describe('when listing objects', () => {
    beforeEach(() => {
      td.when(AWS.S3.prototype.listObjects(td.matchers.argThat((args) => Object.keys(args).length >= 2))).thenReturn({
        promise: td.when(td.function()()).thenResolve({
          Status: 200,
          IsTruncated: false,
          Contents: [
            { Key: '1.jpg' },
            { Key: '2.jpg' }
          ]
        })
      })
    })

    it('should call AWS.S3.listObjects and resolve', async () => {
      const lifter = new Lifter()
      const result = await lifter._listObjects('test-bucket')

      const captor = td.matchers.captor()
      td.verify(AWS.S3.prototype.listObjects(captor.capture()))
      captor.value.Bucket.should.be.equal('test-bucket')
      captor.value.MaxKeys.should.be.equal(1000)

      result.should.be.an('array')
      result.length.should.be.equal(2)
    })
  })
})
