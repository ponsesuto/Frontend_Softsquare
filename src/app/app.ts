import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DashboardSummary, Medicine, MedicineRequest, User } from './models';
import { PharmacyApiService } from './pharmacy-api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PharmacyApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected readonly statuses = ['Available', 'Low stock', 'Out of stock'];
  protected readonly types = ['Pain relief', 'Allergy', 'Digestive care', 'First aid', 'Vitamins'];
  protected medicines: Medicine[] = [];
  protected users: User[] = [];
  protected summary?: DashboardSummary;
  protected selected?: Medicine;
  protected loading = false;
  protected error = '';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
    status: ['Available', [Validators.required]],
    type: ['Pain relief', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    relatedUserId: [1, [Validators.required]]
  });

  ngOnInit() {
    this.loadAll();
  }

  protected async loadAll() {
    this.loading = true;
    this.error = 'Waiting for the backend API...';

    while (true) {
      try {
        const [users, medicines, summary] = await Promise.all([
          this.api.getUsers(),
          this.api.getMedicines(),
          this.api.getSummary()
        ]);

        this.users = users;
        this.medicines = medicines;
        this.summary = summary;
        this.loading = false;
        this.error = '';

        if (users.length && !this.form.controls.relatedUserId.value) {
            this.form.controls.relatedUserId.setValue(users[0].id);
        }

        this.changeDetector.detectChanges();
        return;
      } catch {
        await this.delay(1000);
      }
    }
  }

  protected async refreshMedicines() {
    this.loading = true;
    this.error = '';

    try {
      const [medicines, summary] = await Promise.all([
        this.api.getMedicines(),
        this.api.getSummary()
      ]);

      this.medicines = medicines;
      this.summary = summary;
      this.loading = false;
      this.changeDetector.detectChanges();
    } catch {
      this.showApiError();
    }
  }

  protected async saveMedicine() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue() as MedicineRequest;

    try {
      if (this.selected) {
        await this.api.updateMedicine(this.selected.id, request);
      } else {
        await this.api.createMedicine(request);
      }

      this.resetForm();
      await this.refreshMedicines();
    } catch {
      this.showApiError();
    }
  }

  protected editMedicine(medicine: Medicine) {
    this.selected = medicine;
    this.form.patchValue({
      name: medicine.name,
      description: medicine.description,
      status: medicine.status,
      type: medicine.type,
      price: medicine.price,
      quantity: medicine.quantity,
      relatedUserId: medicine.relatedUserId
    });
  }

  protected async deleteMedicine(medicine: Medicine) {
    try {
      await this.api.deleteMedicine(medicine.id);

      if (this.selected?.id === medicine.id) {
        this.resetForm();
      }

      await this.refreshMedicines();
    } catch {
      this.showApiError();
    }
  }

  protected resetForm() {
    this.selected = undefined;
    this.form.reset({
      name: '',
      description: '',
      status: 'Available',
      type: 'Pain relief',
      price: 0,
      quantity: 0,
      relatedUserId: this.users[0]?.id ?? 1
    });
  }

  private showApiError() {
    this.loading = false;
    this.error = 'Cannot connect to the backend API. Start PharmacyApi first.';
    this.changeDetector.detectChanges();
  }

  private delay(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }
}
