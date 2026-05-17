import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';
import { AccountService } from '../../_services/account.service';

@Component({ templateUrl: 'list.component.html', standalone: false })
export class ListComponent implements OnInit {
  accounts: any[] = [];

  constructor(private accountService: AccountService) {}

  ngOnInit() {
    this.accountService.getAll()
      .pipe(first())
      .subscribe((accounts: any[]) => this.accounts = accounts);
  }

  deleteAccount(account: any) {
    account.isDeleting = true;
    this.accountService.delete(account.id)
      .pipe(first())
      .subscribe(() => {
        this.accounts = this.accounts.filter(x => x.id !== account.id);
      });
  }
}