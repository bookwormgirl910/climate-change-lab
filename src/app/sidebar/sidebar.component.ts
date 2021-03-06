import { Component, EventEmitter, ViewEncapsulation, OnInit, Output } from '@angular/core';

import { IndicatorService } from '../services/indicator.service';
import { Indicator } from '../models/indicator.model';

/*
 * Sidebar Component
 * Populates sidebar with indicators and triggers adding charts
 */

@Component({
  selector: 'ccl-sidebar',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit {

    @Output() onIndicatorSelected = new EventEmitter<Indicator>();

    public tempIndicators: Indicator[];
    public precipIndicators: Indicator[];

    constructor(private indicatorService: IndicatorService) {}

    onIndicatorClicked(indicator: Indicator) {
        this.onIndicatorSelected.emit(indicator);
    }

    ngOnInit() {
        this.indicatorService.list().subscribe(data => this.groupIndicators(data));
    }

    private groupIndicators(indicators: Indicator[]) {
        // Filter any indicators with "required" params, we can't currently display them
        //  without changes to the Lab
        // TODO: Remove this filter once we've implemented user controls for indicator parameters
        const visibleIndicators = indicators.filter(i => {
            return !i.parameters.some(p => p.required);
        });
        this.tempIndicators = visibleIndicators.filter(i => {
            return (i.variables.indexOf('tasmax') !== -1 || i.variables.indexOf('tasmin') !== -1);
        });
        this.precipIndicators = visibleIndicators.filter(i => {
            return i.variables.indexOf('pr') !== -1;
        });
    }
}
