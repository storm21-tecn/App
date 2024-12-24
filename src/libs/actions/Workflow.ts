import lodashDropRightWhile from 'lodash/dropRightWhile';
import lodashMapKeys from 'lodash/mapKeys';
import type { NullishDeep, OnyxCollection, OnyxUpdate } from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import * as API from '@libs/API';
import type {
    CreateWorkspaceApprovalParams,
    RemoveWorkspaceApprovalParams,
    UpdateWorkspaceApprovalParams,
} from '@libs/API/parameters';
import { WRITE_COMMANDS } from '@libs/API/types';
import { calculateApprovers, convertApprovalWorkflowToPolicyEmployees } from '@libs/WorkflowUtils';
import CONST from '@src/CONST';
import type { TranslationPaths } from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type { ApprovalWorkflowOnyx, PersonalDetailsList, Policy } from '@src/types/onyx';
import type { Approver, Member } from '@src/types/onyx/ApprovalWorkflow';
import { isEmptyObject } from '@src/types/utils/EmptyObject';

let currentApprovalWorkflow: ApprovalWorkflowOnyx | undefined;
Onyx.connect({
    key: ONYXKEYS.APPROVAL_WORKFLOW,
    callback: (approvalWorkflow) => {
        if (!approvalWorkflow) {
            console.error('Approval workflow is undefined');
        }
        currentApprovalWorkflow = approvalWorkflow;
    },
});

let allPolicies: OnyxCollection<Policy> = {};
Onyx.connect({
    key: ONYXKEYS.COLLECTION.POLICY,
    waitForCollectionCallback: true,
    callback: (value) => {
        if (!value) {
            console.error('Policy collection is undefined');
        }
        allPolicies = value;
    },
});

let authToken: string | undefined;
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: (value) => {
        if (!value || !value.authToken) {
            console.error('Auth token is missing');
        }
        authToken = value?.authToken;
    },
});

let personalDetailsByEmail: PersonalDetailsList = {};
Onyx.connect({
    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
    callback: (personalDetails) => {
        if (!personalDetails) {
            console.error('Personal details are undefined');
        }
        personalDetailsByEmail = lodashMapKeys(personalDetails, (value, key) => value?.login ?? key);
    },
});

function createApprovalWorkflow(policyID: string, approvalWorkflow: ApprovalWorkflow) {
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];

    if (!authToken || !policy) {
        console.error('Missing authToken or policy in createApprovalWorkflow');
        return;
    }

    const previousEmployeeList = Object.fromEntries(
        Object.entries(policy.employeeList ?? {}).map(([key, value]) => [key, { ...value, pendingAction: null }])
    );
    const previousApprovalMode = policy.approvalMode;
    const updatedEmployees = convertApprovalWorkflowToPolicyEmployees({
        previousEmployeeList,
        approvalWorkflow,
        type: CONST.APPROVAL_WORKFLOW.TYPE.CREATE,
    });

    if (isEmptyObject(updatedEmployees)) {
        console.info('No changes to employees list, exiting early');
        return;
    }

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.SET,
            key: ONYXKEYS.APPROVAL_WORKFLOW,
            value: null,
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                employeeList: updatedEmployees,
                approvalMode: CONST.POLICY.APPROVAL_MODE.ADVANCED,
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                employeeList: previousEmployeeList,
                approvalMode: previousApprovalMode,
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                employeeList: Object.fromEntries(
                    Object.keys(updatedEmployees).map((key) => [key, { pendingAction: null }])
                ),
            },
        },
    ];

    const parameters: CreateWorkspaceApprovalParams = {
        policyID,
        authToken,
        employees: JSON.stringify(Object.values(updatedEmployees)),
    };

    API.write(WRITE_COMMANDS.CREATE_WORKSPACE_APPROVAL, parameters, {
        optimisticData,
        failureData,
        successData,
    }).catch((error) => {
        console.error('Error in API.write for createApprovalWorkflow:', error);
    });
}

// The rest of the functions (updateApprovalWorkflow, removeApprovalWorkflow, etc.) would be similarly updated.

export {
    createApprovalWorkflow,
    // Other functions would be exported here after similar updates
};
