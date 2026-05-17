import { AbstractControl, ValidatorFn } from '@angular/forms';

export function MustMatch(controlName: string, matchingControlName: string): ValidatorFn {
  return (group: AbstractControl) => {
    const control = group.get(controlName);
    const matching = group.get(matchingControlName);
    if (!control || !matching) return null;
    if (matching.errors && !matching.errors['mustMatch']) return null;
    matching.setErrors(control.value !== matching.value ? { mustMatch: true } : null);
    return null;
  };
}