import { Component, OnInit, Input } from '@angular/core';

import {} from ''

import { ClimateModel } from '../../models/climate-model.model';
import { ProjectData } from '../../models/project-data.model';
import { ClimateModelService } from '../../services/climate-model.service';

/*  Model Modal Component
    -- Requires project input
    -- Emits selected model
    Expected use:
        <ccl-model-modal
            [projectData]="your_project.project_data">
*/

@Component({
  selector: 'ccl-model-modal',
  templateUrl: './model-modal.component.html'
})
export class ModelModalComponent implements OnInit {

    @Input() projectData: ProjectData;

    public buttonText: string;
    public climateModels: ClimateModel[] = [];
    public smModal: any;

    constructor(private climateModelService: ClimateModelService) {}

    ngOnInit() {
        this.getClimateModels();
    }

    // unselect all model checkboxes when option to use all models selected
    public clearClimateModels() {
        this.climateModels.forEach(model => model.selected = false);
    }

    public isModalUpdateButtonDisabled() {
        return this.climateModels.filter(model => model.selected).length === 0;
    }

    public selectAllClimateModels() {
        this.climateModels.forEach(model => model.selected = true);
    }

    public updateProjectClimateModels() {
        this.projectData.models = this.filterSelectedClimateModels();
        this.updateButtonText();
    }

    public modalHide() {
        const models = this.filterSelectedClimateModels();
        if (models.length < 1) {
          this.selectAllClimateModels();
        }
        this.updateProjectClimateModels();
    }

    private filterSelectedClimateModels(isSelected: boolean = true) {
        return this.climateModels.filter(model => model.selected === isSelected);
    }

    // subscribe to list of available models from API endpoint
    private getClimateModels() {
        this.climateModelService.list().subscribe(data => {
            this.climateModels = data;

            // Initialize 'selected' attributes with models in project
            if (this.projectData.models.length === 0) {
                this.selectAllClimateModels();
                this.updateProjectClimateModels();
            } else {
                this.projectData.models.forEach(projectModel => {
                    this.climateModels.forEach(model => {
                        if (projectModel.name === model.name) {
                           model.selected = projectModel.selected;
                        }
                    });
                });
            }
            this.updateButtonText();
        });
    }

    private updateButtonText() {
        this.buttonText = this.projectData.models.length === this.climateModels.length ?
            'All available models' : 'Subset of models';
    }
}
