import { Component, OnInit, Input } from '@angular/core';

import { Scenario } from '../../models/scenario.model';
import { ProjectData } from '../../models/project-data.model';
import { ScenarioService } from '../../services/scenario.service';
import { ProjectService } from '../../services/project.service';

/*  Scenario Dropdown Component

    -- Requires project input
    Expected use:
        <scenario-dropdown
            [projectData]="your_project.project_data">
*/

@Component({
  selector: 'scenario-dropdown',
  template: `<div dropdown class="dropdown dropdown-scenario">
              <button dropdownToggle class="button dropdown-toggle" type="button"
                id="scenarioDropdown" data-toggle="dropdown" aria-haspopup="true"
                aria-expanded="true">
                <i class="icon-flash"></i>
                {{ projectData.scenario.label || "Select Scenario" }}
                <i class="icon-angle-down caret"></i>
              </button>
              <ul dropdownMenu class="dropdown-menu" aria-labelledby="scenarioDropdown">
                <li *ngFor="let scenario of scenarios">
                  <a (click)="onScenarioClicked(scenario)"
                    tooltip="{{ scenario.description }}"
                    tooltipPlacement="bottom"
                    tooltipTrigger="mouseenter"
                    tooltipPopupDelay="300">{{ scenario.label }}</a>
                </li>
              </ul>
            </div>`
})
export class ScenarioDropdownComponent implements OnInit {

    @Input() projectData: ProjectData;
    private DEFAULT_SCENARIO_NAME: string = 'RCP85';
    public scenarios: Scenario[] = [];

    constructor(private scenarioService: ScenarioService,
                private projectService: ProjectService) {}

    ngOnInit() {
        this.getScenarios();
    }

    public onScenarioClicked(scenario: Scenario) {
        this.projectData.scenario = scenario;
    }

    private getScenarios() {
        this.scenarioService.list().subscribe(data => {
            this.scenarios = data;

            // Set a default for the project if none is set
            if (!this.projectData.scenario.label) {
                this.onScenarioClicked(this.scenarios.find((s) => {
                    return s.name === this.DEFAULT_SCENARIO_NAME;
                }));
            }
        });
    }
}
