var apmBase = require('../../src/index.js').apmBase
var apmCore = require('elastic-apm-js-core')

describe('index', function () {
  var originalTimeout

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
  })

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })

  it('should init ApmBase', function (done) {
    var apmServer = apmBase.serviceFactory.getService('ApmServer')
    if (window.globalConfigs && window.globalConfigs.useMocks) {
      apmServer._makeHttpRequest = function () {
        return Promise.resolve()
      }
    }

    spyOn(apmServer, 'sendErrors').and.callThrough()
    spyOn(apmServer, '_postJson').and.callThrough()

    try {
      throw new Error('ApmBase test error')
    } catch(error) {
      apmBase.captureError(error)
      if (apmCore.utils.isPlatformSupported()) {
        expect(apmServer.errorQueue.items.length).toBe(1)
        apmServer.errorQueue.flush()
        expect(apmServer.errorQueue.items.length).toBe(0)
        expect(apmServer.sendErrors).toHaveBeenCalled()
        expect(apmServer._postJson).not.toHaveBeenCalled()
        apmServer.sendErrors.calls.reset()
      }
    }
    apmBase.init({
      serverUrl: window.globalConfigs.serverUrl,
      serviceName: 'apm-agent-js-base-test',
      flushInterval: 100
    })

    apmBase.setUserContext({usertest: 'usertest',id: 'userId',username: 'username',email: 'email'})
    apmBase.setCustomContext({testContext: 'testContext'})

    try {
      throw new Error('ApmBase test error')
    } catch(error) {
      apmBase.captureError(error)
      expect(apmServer.sendErrors).not.toHaveBeenCalled()
      if (apmCore.utils.isPlatformSupported()) {
        expect(apmServer.errorQueue.items.length).toBe(1)
        setTimeout(() => {
          expect(apmServer.sendErrors).toHaveBeenCalled()
          var callData = apmServer.sendErrors.calls.mostRecent()
          callData.returnValue.then(() => {
            done()
          }, (reason) => {
            fail('Failed sending error:', reason)
          })
        }, 200)
      } else {
        done()
      }
    }
  })
})