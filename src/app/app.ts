import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms'; // เพิ่ม FormsModule
import { DashboardSummary, Medicine, MedicineRequest, User } from './models';
import { PharmacyApiService } from './pharmacy-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule], // ต้องใส่ FormsModule ด้วย
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
  protected showForm = false;

  // ตัวแปรสำหรับ Search, Filter, Sort
  protected searchQuery = '';
  protected activeFilter = ''; // ค่าว่างคือแสดงทั้งหมด
  protected sortColumn = '';
  protected sortAscending = true;

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
    // ฟังก์ชันนี้จะถูกเรียกทันทีที่เปิดหน้าเว็บแบบชัวร์ๆ
    this.loadAll();
  }

  protected async loadAll() {
    this.loading = true;
    this.error = 'Waiting for the backend API...';
    let isFirstLoad = true;

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

        if (isFirstLoad) {
          this.loading = false;
          this.error = '';
          if (users.length && !this.form.controls.relatedUserId.value) {
            this.form.controls.relatedUserId.setValue(users[0].id);
          }
          isFirstLoad = false;
        }

        this.changeDetector.detectChanges();

        // 💡 เปลี่ยนมาใช้คำสั่งมาตรฐานตัวนี้แทน โหลดข้อมูลเสร็จแล้วจะรอ 3 วินาที (3000 ms) ชัวร์ๆ ครับ
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch {
        if (isFirstLoad) {
          this.error = 'Cannot connect to the backend API. Start PharmacyApi first.';
        }
        this.changeDetector.detectChanges();
        
        // 💡 หากดึงข้อมูลไม่สำเร็จ ให้รอ 2 วินาทีแล้วลองใหม่
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private async refreshMedicines() {
    this.medicines = await this.api.getMedicines();
  }

  private async refreshSummary() {
    this.summary = await this.api.getSummary();
  }

  // ==========================================
  // ฟังก์ชันคำนวณข้อมูลที่จะแสดงในตาราง (Search, Filter, Sort)
  // ==========================================
  get displayedMedicines(): Medicine[] {
    let result = this.medicines;

    // 1. กรองด้วย Search (ค้นหาชื่อ หรือ รายละเอียด)
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.description.toLowerCase().includes(q)
      );
    }

    // 2. กรองด้วยประเภท (Filter Tags)
    if (this.activeFilter) {
      result = result.filter(m => m.type === this.activeFilter);
    }

    // 3. เรียงลำดับ (Sorting)
    if (this.sortColumn) {
      result = result.sort((a: any, b: any) => {
        let valA = a[this.sortColumn];
        let valB = b[this.sortColumn];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    return result;
  }

  // คลิกหัวตารางเพื่อเรียงลำดับ
  protected sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending; // สลับมากไปน้อย / น้อยไปมาก
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }
  }

  // คลิกปุ่มตัวกรองประเภท
  protected toggleFilter(type: string) {
    // ถ้ากดประเภทเดิมซ้ำ ให้ยกเลิกการกรอง
    this.activeFilter = this.activeFilter === type ? '' : type;
  }
  // ==========================================

  protected openAddMedicine() {
    this.resetForm();
    this.showForm = true;
  }

  protected closeForm() {
    this.showForm = false;
    this.resetForm();
  }

  protected async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      const request: MedicineRequest = this.form.getRawValue();
      if (this.selected) {
        await this.api.updateMedicine(this.selected.id, request);
      } else {
        await this.api.createMedicine(request);
      }
      this.closeForm();
      await Promise.all([this.refreshMedicines(), this.refreshSummary()]);
    } catch {
      this.error = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
    } finally {
      this.loading = false;
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
    this.showForm = true;
  }

  protected async deleteMedicine(medicine: Medicine) {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${medicine.name}?`)) return;
    try {
      await this.api.deleteMedicine(medicine.id);
      if (this.selected?.id === medicine.id) this.closeForm();
      await Promise.all([this.refreshMedicines(), this.refreshSummary()]);
    } catch {
      this.error = 'ไม่สามารถลบข้อมูลได้';
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
}