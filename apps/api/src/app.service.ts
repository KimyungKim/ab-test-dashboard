import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getInfo() {
    return { name: 'ab-test-dashboard-api', version: '0.0.1' }
  }
}
