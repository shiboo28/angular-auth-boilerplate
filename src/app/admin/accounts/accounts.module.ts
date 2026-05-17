import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AccountsRoutingModule } from './accounts-routing.module';
import { LayoutComponent } from './layout.component';
import { ListComponent } from './list.component';
import { AddEditComponent } from './add-edit.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, AccountsRoutingModule],
  declarations: [LayoutComponent, ListComponent, AddEditComponent]
})
export class AccountsModule {}