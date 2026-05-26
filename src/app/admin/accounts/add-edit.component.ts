import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AccountService } from '../../_services/account.service';
import { AlertService } from '../../_services/alert.service';

@Component({ templateUrl: 'add-edit.component.html', standalone: false })
export class AddEditComponent implements OnInit {
  form!: UntypedFormGroup;
  id?: string;
  isAddMode!: boolean;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    this.isAddMode = !this.id;
    this.form = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isAddMode ? [Validators.required, Validators.minLength(6)] : []]
    });
    if (!this.isAddMode) {
      this.accountService.getById(this.id!)
        .pipe(first())
        .subscribe((account: any) => this.form.patchValue(account));
    }
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.alertService.clear();
    if (this.form.invalid) return;
    this.loading = true;

    const formData = { ...this.form.value };

    // If password is empty in edit mode, remove it from payload
    if (!this.isAddMode && !formData.password) {
      delete formData.password;
      delete formData.confirmPassword;
    } else if (formData.password) {
      // Always add confirmPassword to match backend validation
      formData.confirmPassword = formData.password;
    }

    if (this.isAddMode) {
      this.accountService.create(formData)
        .pipe(first())
        .subscribe({
          next: () => {
            this.alertService.success('Account created', { keepAfterRouteChange: true });
            this.router.navigate(['/admin/accounts']);
          },
          error: (err: any) => { this.error = err; this.loading = false; }
        });
    } else {
      this.accountService.update(this.id!, formData)
        .pipe(first())
        .subscribe({
          next: () => {
            this.alertService.success('Account updated', { keepAfterRouteChange: true });
            this.router.navigate(['/admin/accounts']);
          },
          error: (err: any) => { this.error = err; this.loading = false; }
        });
    }
  }
}