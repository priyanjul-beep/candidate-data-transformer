export interface PipelineResult {
    canonical: Record<string, any>;
    projected: Record<string, any>;
    validation_errors: string[];
}
export declare function runPipeline(recruiterCsvPath?: string | null, atsJsonPath?: string | null, notesTxtPath?: string | null, config?: Record<string, any> | null, candidateId?: string): PipelineResult;
//# sourceMappingURL=pipeline.d.ts.map