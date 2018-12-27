const Koa = require('koa2')
const bodyParser = require('koa-bodyparser')
const cors = require('koa-cors')
const fs = require('fs')
const path = require('path')
const {set_random_port} = require('./port_share')

const data_JSON_path = './temp/data.json'

const second_service_port = set_random_port()
const {fetchy_util: connection_second_service} = require('./request_util')(`http://localhost:${second_service_port}`)
const {fetchy_util: connection_to_token_servise} = require('./request_util')('http://localhost:8082')


async function autorized_request(cntx, token) {
  const {body, body: {token: resp_token}} = await connection_to_token_servise.post('/', {action: 'ASSERT_TOKEN', token})
  if(resp_token === 'ok') {
    return true
  }
  return cntx.body = body
}


const is_exist_JSON_data = () => fs.existsSync(path.resolve(process.cwd(), data_JSON_path))

function save_JSON_data(data) {
  const save_data = (json_data) => {
    try {
      fs.unlink(data_JSON_path)
      fs.writeFileSync(data_JSON_path, JSON.stringify(json_data))
      return {json_data: 'ok'}
    } catch(e) {
      console.error(e)
      return {json_data: 'data save error'}
    }
  }
  if(is_exist_JSON_data()) {
    const existing_JSON_data = JSON.parse(require(data_JSON_path))
    if(Array.isArray(existing_JSON_data)) {
      existing_JSON_data.push(data)
      return save_data(existing_JSON_data)
    } else if(typeof data === 'object') {
      const new_data = {...existing_JSON_data, data}
      return save_data(new_data)
    }
  }
}
// if json file does not exist  return {json_data: 'not found'}
function get_JSON_data() {
  if(is_exist_JSON_data()) {
    return require(data_JSON_path)
  } else {
    return {json_data: 'not found'}
  }
}
// service works with JSON format files

const servise_1_action_types = {
  ASSERT_CONNECTION: 'ASSERT_CONNECTION',
  ASSERT_CONNECTION_ENVIRONMENT: 'ASSERT_CONNECTION_ENVIRONMENT',
  SAVE_JSON_DATA: 'SAVE_JSON_DATA',
  GET_JSON_DATA: 'GET_JSON_DATA',
  AUTORIZATION: 'AUTORIZATION'
}

const app = new Koa()
// app.use(cors())
app.use(bodyParser())

const request_worker = async (cntx) => {
  const {request: {body: {action, token, data}}} = cntx
  console.log(action)
  switch(action) {
    case servise_1_action_types.ASSERT_CONNECTION: {
      return cntx.body = {connection: 'ok'}
    }
    case servise_1_action_types.AUTORIZATION: {
      const {body: {token}} = await connection_to_token_servise.post('/', {action: 'GENERATE_TOKEN'})
      // if token user is autorized
      if(token) {return {token}}
      return {token: 'something went wrong'}
    }
    case servise_1_action_types.ASSERT_CONNECTION_ENVIRONMENT: {
      const {body} = await connection_second_service.post('/', {action: 'ASSERT_CONNECTION'})
      if(body.connection) {
        return cntx.body = {service_connection: 'ok'}
      }
      return cntx.body = {service_connection: 'service connection not aviliable'}
    }
    case servise_1_action_types.SAVE_JSON_DATA: {
      const is_autorized = await autorized_request(cntx, token)
      if(is_autorized) {cntx.body = save_JSON_data(data)}
      return cntx
    }
    case servise_1_action_types.GET_JSON_DATA: {
      console.log(token)
      const is_autorized = await autorized_request(cntx, token)
      console.log(is_autorized)
      if(!is_autorized.token) {cntx.body = get_JSON_data()}
      return cntx
    }
    default:
      return cntx.body = {ok: 'ok'}
  }
}
// set random port for service_
// set_random_port()
app.use(request_worker)

app.listen(8081)