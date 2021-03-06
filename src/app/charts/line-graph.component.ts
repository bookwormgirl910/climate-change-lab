import {
    Component,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    ViewEncapsulation
} from '@angular/core';

import { ChartData } from '../models/chart-data.model';
import { DataPoint } from '../models/data-point.model';
import { Indicator } from '../models/indicator.model';
import * as D3 from 'd3';
import * as _ from 'lodash';
import * as $ from 'jquery';

import { ChartService } from '../services/chart.service';

/*
 * Line graph component
 * Contains all logic for drawing a line graph
 */
@Component({
  selector: 'ccl-line-graph',
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content>`
})

export class LineGraphComponent implements OnChanges {

    @Input() public data: ChartData[];
    @Input() public indicator: Indicator;
    @Input() public trendline: Boolean;
    @Input() public min: Boolean;
    @Input() public max: Boolean;
    @Input() public minVal: number;
    @Input() public maxVal: number;
    @Input() public hover: Boolean;

    public extractedData: Array<DataPoint>;

    private host;                          // D3 object referebcing host dom object
    private svg;                           // SVG in which we will print our chart
    private margin;                        // Space between svg borders and the actual chart graphic
    private width;                         // Component width
    private height;                        // Component height
    private xScale;                        // D3 scale in X
    private yScale;                        // D3 scale in Y
    private htmlElement;                   // Host HTMLElement
    private valueline;                     // Base for a chart line
    private xRange: Array<Date>;           // Min, max date range
    private xData: Array<number>;          // Stores x axis data as integers rather than dates,
                                           // necessary for trendline math
    private yData: Array<number>;          // Stores primary y axis data, multi-use
    private timeFormat: string;            // Date formatting for x axis labels (e.g, '%Y-%m')
    private scrubber;                      // Lump of scrubber elements
    private id: string;                    // Randomly generated int # used to distinguish the chart
                                           // for drawing and isolated chart scrubber.
                                           // Not a perfect solution should the random int and
                                           // indicator be the same. However, this is quite unlikely
                                           // (1/10000, and even less likely by way of app use)

    /* We request angular for the element reference
    * and then we create a D3 Wrapper for our host element
    */
    constructor(private element: ElementRef, private chartService: ChartService) {
        this.htmlElement = this.element.nativeElement;
        this.host = D3.select(this.element.nativeElement);
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.ngOnChanges();
    }

    // If the chart is being hovered over, handle mouse movements
    @HostListener('mousemove', ['$event'])
    onMouseMove(event) {
        // for single-chart scrubber
        if (this.hover) {
            this.redrawScrubber(event);
        }
    }

    /* Executes on every @Input change */
    ngOnChanges(): void {
        if (!this.data || this.data.length === 0) { return };
        this.filterData();
        this.setup();
        this.buildSVG();
        this.setLineScales();
        this.drawGrid();
        this.drawMinMaxBand();
        this.drawTrendLine();
        this.drawThresholds();
        this.drawXAxis();
        this.drawYAxis();
        this.drawAvgLine();
        this.drawScrubber();
    }

    private filterData(): void {
        // Preserves parent data by fresh copying indicator data that will undergo processing
        const clippedData = _.cloneDeep(_.find(this.data, obj =>
                                             obj.indicator.name === this.indicator.name));
        _.has(clippedData, 'data') ?
            this.extractedData = clippedData['data'] : this.extractedData = [];
        // Remove empty day in non-leap years (affects only daily data)
        if (this.extractedData[365] && this.extractedData[365]['date'] == null) {
            this.extractedData.pop();
        }
        this.timeFormat = clippedData.time_format;
    }

    /* Will setup the chart basics */
    private setup(): void {
        this.margin = { top: 20, right: 40, bottom: 40, left: 50 };
        this.width = $('.chart').width() - this.margin.left - this.margin.right;
        this.height = 214 - this.margin.top - this.margin.bottom;
        this.xScale = D3.scaleTime().range([0, this.width]);
        this.yScale = D3.scaleLinear().range([this.height, 0]);
        this.id = this.indicator.name + (Math.round(Math.random() * 10000)).toString();
    }

    /* Will build the SVG Element */
    private buildSVG(): void {
        this.host.html('');
        this.svg = this.host.append('svg')
          .attr('id', 'chart-' + this.indicator.name)
          .attr('width', this.width + this.margin.left + this.margin.right)
          .attr('height', this.height + this.margin.top + this.margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
    }

    // Set axis and line scales
    private setLineScales(): void {
        // Sort data by date ascending
        this.extractedData.sort(function(a, b) { return +a.date - +b.date; });
        // Parse out avg data for ease of use later
        this.yData = _.map(this.extractedData, d => d.values.avg);

        this.xRange = D3.extent(this.extractedData, d => d.date);
        this.xScale.domain(this.xRange);

        // Adjust y scale, prettify graph
        const minY = D3.min(_.map(this.extractedData, d => d.values.min));
        const maxY = D3.max(_.map(this.extractedData, d => d.values.max));
        // Note: 5 as default is arbitrary
        const yPad = (maxY - minY) > 0 ? (maxY - minY) * 1 / 3 : 5;
        // if minY is 0, keep it that way
        this.yScale.domain([minY === 0 ? minY : minY - yPad, maxY + yPad]);

        // Expects line data as DataPoint[]
        this.valueline = D3.line()
          .x(d => this.xScale(d.date))
          .y(d => this.yScale(d.value));
    }

    /* Will draw the X Axis */
    private drawXAxis(): void {
        this.svg.append('g')
          .attr('transform', 'translate(0,' + this.height + ')')
          .attr('class', 'axis')
          .call(D3.axisBottom(this.xScale)
              .ticks(5)
              .tickSize(0)
              .tickFormat(D3.timeFormat(this.timeFormat)))
          .selectAll('text')
          .attr('y', 10);
    }

    /* Will draw the Y Axis */
    private drawYAxis(): void {
        this.svg.append('g')
          .attr('class', 'axis')
          .call(D3.axisLeft(this.yScale)
              .tickSize(0)
              .ticks(5))
          .selectAll('text')
          .attr('x', -10);
    }

    private drawGrid(): void {
        this.svg.append('g')
            .attr('class', 'grid line')
            .call(this.makeXGridlines()
                .tickSize(this.height)
                .tickFormat(''));

        this.svg.append('g')
            .attr('class', 'grid line')
            .call(this.makeYGridlines()
                .tickSize(-this.width)
                .tickFormat(''));
    }

    private makeXGridlines() {
        return D3.axisBottom(this.xScale)
            .ticks(5);
    }

    private makeYGridlines() {
        return D3.axisLeft(this.yScale)
            .ticks(5);
    }

    /* Draw line */
    private drawAvgLine(): void {
        const data = _.map(this.extractedData, d => ({'date': d.date, 'value': d.values.avg }));
        this.drawLine(data, 'line');
    }

    private drawTrendLine(): void {
        // Only draw if data and add trendline flag
        if (this.trendline && this.extractedData.length) {
            this.xData = D3.range(1, this.yData.length + 1);

            // Calculate linear regression variables
            const leastSquaresCoeff = this.leastSquares(this.xData, this.yData);

            // Apply the results of the regression
            const x1 = this.xRange[1];
            const y1 = leastSquaresCoeff[0] + leastSquaresCoeff[1];
            const x2 = this.xRange[0];
            const y2 = leastSquaresCoeff[0] * this.xData.length + leastSquaresCoeff[1];
            const trendData = [{'date': x1, 'value': y2}, {'date': x2, 'value': y1}];
            // Add trendline
            this.drawLine(trendData, 'trendline');
        }
    }

    // returns slope, intercept and r-square of the line
    private leastSquares(xData: Array<number>, yData: Array<number>): Array<number> {
        const reduceSumFunc = function(prev, cur) { return prev + cur; };

        const xBar = xData.reduce(reduceSumFunc) * 1.0 / xData.length;
        const yBar = yData.reduce(reduceSumFunc) * 1.0 / yData.length;
        const ssXX = _.map(xData, d => Math.pow(d - xBar, 2))
                    .reduce(reduceSumFunc);

        const ssYY = _.map(yData, d => Math.pow(d - yBar, 2))
                    .reduce(reduceSumFunc);

        const ssXY = _.map(xData, (d, i) => (d - xBar) * (yData[i] - yBar))
                    .reduce(reduceSumFunc);

        const slope = ssXY / ssXX;
        const intercept = yBar - (xBar * slope);
        const rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

        return [slope, intercept, rSquare];
    }

    private drawMinMaxBand(): void {
        const area = D3.area()
            .x(d => this.xScale(d.date))
            .y0(d => this.yScale(d.min))
            .y1(d => this.yScale(d.max));

        const minMaxData = _.map(this.extractedData, d => ({'date': d.date,
                                                          'min': d.values.min,
                                                          'max': d.values.max}));

        // Draw min/max area
        this.svg.append('path')
          .data([minMaxData])
          .attr('class', 'area')
          .attr('d', area);
    }

    private drawThresholds(): void {
        if (this.min || this.max) {
            if (this.min) {
                // Prepare data for bar graph
                const minBars = _(this.extractedData)
                              .map((datum) => ({ 'date': datum['date'] }))
                              /* tslint:disable-next-line:no-unused-variable */
                              .filter((bar, index) => this.minVal > this.yData[index])
                              .value();

                // Add bar graph
                this.drawBands(minBars, 'min-bar');
            }

            if (this.max) {
                // Prepare data for bar graph
                const maxBars = _(this.extractedData)
                              .map((datum) => ({ 'date': datum['date'] }))
                              /* tslint:disable-next-line:no-unused-variable */
                              .filter((bar, index) => this.maxVal < this.yData[index])
                              .value();

                // Add bar graph
                this.drawBands(maxBars, 'max-bar');
            }
        }
    }

    private drawScrubber(): void {
        // Vertical scrub line. Exists outside scrubber cluster because it moves independently
        this.svg.append('line')
            .attr('class', 'scrubline' + ' ' + this.id)
            .attr('x1', 0).attr('x2', 0)
            .attr('y1', 0).attr('y2', this.height)
            .classed('hidden', true);

        // Other scrubber elements
        this.scrubber = this.svg.append('g')
            .attr('class', this.id)
            .classed('hidden', true);

        this.scrubber.append('circle')
            .attr('r', 4.5);

        this.scrubber.append('rect')
            .attr('class', 'scrubber-box' + ' ' + this.id)
            .attr('height', 20);

        this.scrubber.append('text')
            .attr('class', 'scrubber-text' + ' ' + this.id);

        // Scrubber sensory zone (set to size of graph) intentionally drawn last
        // It overlays all other svg elements for uncompromised mouseover detection
        this.svg.append('rect')
            .attr('id', 'overlay')
            .attr('height', this.height)
            .attr('width', this.width);

        // Toggle scrubber visibility
        this.hover ? $('.' + this.id).toggleClass('hidden', false) :
            $('.' + this.id).toggleClass('hidden', true);
    }

    private redrawScrubber(event) {
        let xPos = event.offsetX - this.margin.left;
        // Firefox handles event positioning differently than Chrome, Safari
        if (navigator && navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
            xPos = event.offsetX;
        }

        // Quit if mouse outside chart bounds; eliminate flashing misbehavior in Firefox too
        if (xPos < 0 || xPos > this.width) { return; }

        // Default round down position to existing time point
        // Note the +unary operator before dates. Converts dates to numbers to quell tslinter
        const bisectDate = D3.bisector(function(d) { return d.date; }).left;
        const x0 = this.xScale.invert(xPos),
            i = +bisectDate(this.extractedData, x0, 1),
            d0 = this.extractedData[i - 1],
            d1 = this.extractedData[i];
        let d: number;

        // Prevent error leaving graph
        if (d0 && d1) {
            d = x0 - +d0.date > +d1.date - x0 ? i : i - 1;
        } else {
            d = i - 1;
        }

        const yDatum = this.yData[d];

        // Move scubber elements
        this.scrubber.attr('transform', 'translate(' + xPos + ',' + this.yScale(yDatum) + ')');
        this.svg.selectAll('.scrubline').attr('transform', 'translate(' + xPos + ',' + 0 + ')');

        // Update scrubber text
        const labelText = yDatum.toFixed(2) + ' ' + this.data[0]['indicator']['default_units'];
        const textSVG = D3.select('.scrubber-text.' + this.id).text(labelText);

        // Center text
        const labelWidth = textSVG.node().getBBox().width;
        textSVG.attr('transform', 'translate(' + -labelWidth / 2 + ',' + -15 + ')');

        // Update text box length
        D3.select('.scrubber-box.' + this.id)
            .attr('width', labelWidth + 10)
            .attr('transform', 'translate(' + -(labelWidth / 2 + 5) + ',' + -30 + ')');
    }

    private drawLine(data: Array<DataPoint>, className: string): void {
        this.svg.append('path')
            .data([data])
            .attr('class', className)
            .attr('d', this.valueline);
    }

    private drawBands(data: Array<DataPoint>, className: string): void {
        const xscale = D3.scaleBand()
            .range([0, this.width])
            .padding(0)
            .domain(_.map(this.extractedData, d => d.date));

        this.svg.selectAll('.' + className)
            .data(data)
            .enter().append('rect')
            .attr('class', className)
            .attr('x', d => xscale(d.date))
            .attr('width', xscale.bandwidth())
            .attr('y', 0)
            .attr('height', this.height);
    }
}
