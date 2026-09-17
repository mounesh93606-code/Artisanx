export interface GuidanceStep {
    id: string;
    workflow_id: string;
    step_order: number;
    screen_name: string;
    target_id: string;
    gesture_type: string;
    instruction_en: string;
    instruction_ta: string;
    instruction_hi: string;
    instruction_te: string;
    instruction_kn: string;
    instruction_ml: string;
    instruction_bn: string;
    instruction_mr: string;
    instruction_ur: string;
    expected_event?: string;
    expected_condition?: string;
    route?: string;
    productStep?: number;
}

export interface GuidanceWorkflow {
    id: string;
    name: string;
    description: string;
    target_role: string;
    is_active: boolean;
    steps?: GuidanceStep[];
}
