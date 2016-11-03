import React, { Component } from "react";
import { connect } from "react-redux";
import { getIn } from "icepick";

import LoadingSpinner from "metabase/components/LoadingSpinner.jsx";

import { TYPE, isa } from "metabase/lib/types";
import { requestEntityNames } from "metabase/redux/entitynames";

function getColumnEntityIdField(column) {
    if (isa(column.special_type, TYPE.PK)) {
        return column.id;
    } else if (isa(column.special_type, TYPE.FK)) {
        return column.target.id;
    }
    return null;
}

const getEntity = (state, { value, column }) => {
    let entityIdField = getColumnEntityIdField(column);
    if (entityIdField != null) {
        return getIn(state, ["entitynames", "entitiesByField", entityIdField, value])
    }
}

const mapStateToProps = (state, props) => ({
    entity: getEntity(state, props),
    entitiesByField: state.entitynames.entitiesByField
});

const mapDispatchToProps = {
    requestEntityNames
};

let pendingRequests = {};
let pendingTimeout;

@connect(mapStateToProps, mapDispatchToProps)
export default class EntityValue extends Component {
    // TODO: re-run this when the value changes
    // normally this debouncing logic etc would be in redux-land but it needs to be extremely fast
    componentWillMount() {
        const { entitiesByField } = this.props;
        let entityId = this.props.value;
        let fieldId = getColumnEntityIdField(this.props.column);
        if (entityId != null && fieldId != null && getIn(entitiesByField, [fieldId, entityId]) == null) {
            pendingRequests[fieldId] = pendingRequests[fieldId] || {};
            pendingRequests[fieldId][entityId] = true;
            if (pendingTimeout != null) {
                clearTimeout(pendingTimeout);
            }
            pendingTimeout = setTimeout(() => {
                this.props.requestEntityNames(pendingRequests);
                pendingRequests = {};
                pendingTimeout = null;
            }, 100);
        }
    }
    render() {
        const { value, entity } = this.props;
        const isLoading = entity && entity.state === "loading";
        return (
            <span className="flex align-center">
                <div>{entity && entity.name != null ? entity.name : value}</div>
                { isLoading && <LoadingSpinner className="ml1" size={15} borderWidth={4}/> }
            </span>
        )
    }
}
