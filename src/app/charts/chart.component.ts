import { Component } from '@angular/core';
import { LineGraphComponent } from './line-graph.component';

/*
 * Chart component
 * Container for each individual chart plus controls
 */
@Component({
  selector: 'chart',
  directives: [LineGraphComponent],
  inputs: ['indicator', 'chartData'],
  templateUrl: './chart.component.html'
})

export class ChartComponent {
  private trendline: boolean;
  private min: boolean;
  private max: boolean;
  private minVal: number;
  private maxVal: number;

  toggleTrendline() {
    this.trendline = !this.trendline;
  }

  toggleMin() {
    this.min = !this.min;
  }

  toggleMax() {
    this.max = !this.max;
  }

  constructor() {
    this.min = false;
    this.max = false;
    this.minVal = 0;
    this.maxVal = 0;
  }
}

