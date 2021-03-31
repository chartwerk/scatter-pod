import { ChartwerkPod, TickOrientation, TimeFormat } from '@chartwerk/core';
import { ScatterData, ScatterOptions, PointType, LineType } from './types';
export declare class ChartwerkScatterPod extends ChartwerkPod<ScatterData, ScatterOptions> {
    _metricsContainer: any;
    _voronoiDiagram: any;
    _voronoiRadius: number;
    constructor(el: HTMLElement, _series?: ScatterData[], _options?: ScatterOptions);
    renderMetrics(): void;
    protected updateCrosshair(): void;
    appendCrosshairPoints(): void;
    protected appendCrosshairPoint(serieIdx: number): void;
    protected renderMetric(datapoints: number[][], metricOptions: {
        color: string;
        target: string;
        pointType: PointType;
        lineType: LineType;
        pointSize: number;
    }): void;
    renderLine(datapoints: number[][], lineType: LineType, color: string): void;
    protected renderPoints(datapoints: number[][], pointType: PointType, pointSize: number, color: string): void;
    protected voronoiDiagramInit(): void;
    onPanningEnd(): void;
    unhighlight(): void;
    highlight(d: [number, number, number]): void;
    protected getCrosshairCirceBackgroundSize(serieIdx: number): number;
    renderSharedCrosshair(timestamp: number): void;
    hideSharedCrosshair(): void;
    onMouseMove(): void;
    onMouseOver(): void;
    onMouseOut(): void;
    getAllDatapoints(): number[][];
}
export declare const VueChartwerkScatterPodObject: {
    render(createElement: any): any;
    mixins: {
        props: {
            id: {
                type: StringConstructor;
                required: boolean;
            };
            series: {
                type: ArrayConstructor;
                required: boolean;
                default: () => any[];
            };
            options: {
                type: ObjectConstructor;
                required: boolean;
                default: () => {};
            };
        };
        watch: {
            id(): void;
            series(): void;
            options(): void;
        };
        mounted(): void;
        methods: {
            render(): void;
            renderChart(): void;
            appendEvents(): void;
            zoomIn(range: any): void;
            zoomOut(center: any): void;
            mouseMove(evt: any): void;
            mouseOut(): void;
            onLegendClick(idx: any): void;
            panningEnd(range: any): void;
            panning(range: any): void;
            contextMenu(evt: any): void;
        };
    }[];
    methods: {
        render(): void;
    };
};
export { ScatterData, ScatterOptions, TickOrientation, TimeFormat, PointType, LineType };
