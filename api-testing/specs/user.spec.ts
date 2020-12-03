import {expect} from 'chai'
import {serviceProvider} from '../framework'

describe('User', function() {
  it('user-data', async () => {
    const {body, status} = await serviceProvider.user.getUserData()
    expect(status).to.equal(200)
    expect(body).to.include.keys('username', 'postal_code')
  })
  it('user-login', async () => {
    const {body, status} = await serviceProvider.user.userLogin( {username: 'test_user', password: 'test_pass'})
    expect(status).to.equal(200)
    expect(body).to.include.keys('authorization')
  })
})
