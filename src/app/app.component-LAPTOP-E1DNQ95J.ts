import { Component, OnInit } from '@angular/core';
import { AccountService } from './_services/account.service';
import { Account } from './_models/account';

@Component({ selector: 'app-root', templateUrl: './app.component.html', standalone: false })
export class AppComponent implements OnInit {
  account: Account | null = null;

  constructor(private accountService: AccountService) {}

  ngOnInit() {
    this.accountService.account.subscribe((x: Account | null) => this.account = x);
  }

  logout() {
    this.accountService.logout();
  }
}