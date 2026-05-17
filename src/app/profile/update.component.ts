import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AccountService } from '../_services/account.service';
import { AlertService } from '../_services/alert.service';
import { MustMatch } from '../_helpers/must-match.validator';

@Component({ templateUrl: 'update.component.html', standalone: false })
export class UpdateComponent implements OnInit {
  form!: UntypedFormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    const account = this.accountService.accountValue!;
    this.form = this.formBuilder.group({
      firstName: [account.firstName, Validators.required],
      lastName: [account.lastName, Validators.required],
      email: [account.email, [Validators.required, Validators.email]],
      password: [''],
      confirmPassword: ['']
    }, { validators: MustMatch('password', 'confirmPassword') });
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.alertService.clear();
    if (this.form.invalid) return;
    this.loading = true;
    this.accountService.update(this.accountService.accountValue!.id, this.form.value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Profile updated', { keepAfterRouteChange: true });
          this.router.navigate(['/profile']);
        },
        error: (err: any) => {
          this.error = err;
          this.loading = false;
        }
      });
  }

  onDelete() {
    if (!confirm('Are you sure?')) return;
    this.accountService.delete(this.accountService.accountValue!.id)
      .pipe(first())
      .subscribe();
  }
}