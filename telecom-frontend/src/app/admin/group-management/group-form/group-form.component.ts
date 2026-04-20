import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService} from '../../../services/group.service';
@Component({
  selector: 'app-group-form',
  templateUrl: './group-form.component.html',
  styleUrls: ['./group-form.component.scss']
})
export class GroupFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;
  groupId: number | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private groupService: GroupService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', Validators.maxLength(200)]
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.groupId = +id;
      this.loadGroup(this.groupId);
    }
  }

  loadGroup(id: number): void {
    this.isLoading = true;
    this.groupService.getGroupById(id).subscribe({
      next: (group) => {
        this.form.patchValue({ name: group.name, description: group.description });
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Groupe introuvable';
        this.isLoading = false;
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const request = this.form.value;

    const obs = this.isEditMode && this.groupId
      ? this.groupService.updateGroup(this.groupId, request)
      : this.groupService.createGroup(request);

    obs.subscribe({
      next: (group) => {
        this.isSaving = false;
        this.router.navigate(['/admin/groups', group.id]);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistrement';
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    if (this.isEditMode && this.groupId) {
      this.router.navigate(['/admin/groups', this.groupId]);
    } else {
      this.router.navigate(['/admin/groups']);
    }
  }

  get nameCtrl() { return this.form.get('name')!; }
  get descCtrl() { return this.form.get('description')!; }
}