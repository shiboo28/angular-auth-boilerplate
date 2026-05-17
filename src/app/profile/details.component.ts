import { Component } from '@angular/core';
import { Account } from '../_models/account';
import { AccountService } from '../_services/account.service';

@Component({ templateUrl: 'details.component.html', standalone: false })
export class DetailsComponent {
  account: Account | null;
  constructor(private accountService: AccountService) {
    this.account = this.accountService.accountValue;
  }
}