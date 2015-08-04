'use strict';

var _ = require('underscore');
var React = require('react');
var ReactBootstrap = require('react-bootstrap');

var Modal = ReactBootstrap.Modal;
var Button = ReactBootstrap.Button;
var Panel = ReactBootstrap.Panel;
var Input = ReactBootstrap.Input;
var ListGroup = ReactBootstrap.ListGroup;
var ListGroupItem = ReactBootstrap.ListGroupItem;
var Badge = ReactBootstrap.Badge;
var PanelGroup = ReactBootstrap.PanelGroup;
var TabbedArea = ReactBootstrap.TabbedArea;
var TabPane = ReactBootstrap.TabPane;
var DropdownButton = ReactBootstrap.DropdownButton;
var MenuItem = ReactBootstrap.MenuItem;

var FormComponentContent = React.createClass({


    _handleIncludeChildrenChange: function () {
        var newState = {
            includeChildren: this.refs.includeChildrenCheckbox.getChecked()
        };
        this.setState(newState);
    },

    _handleIncludeFluxChange: function () {
        var newState = {
            includeFlux: this.refs.includeFluxCheckbox.getChecked()
        };
        this.setState(newState);
    },

    _handleIncludeAllReferencesChange: function () {
        var newState = {
            includeAllReferences: this.refs.includeAllReferencesCheckbox.getChecked()
        };
        this.setState(newState);
    },

    _handleSourcePathChange: function () {
        var newState = {
            componentSourcePath: this.refs.componentSourcePath.getValue()
        };
        this.setState(newState);
    },

    _handleBackStep: function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.props.onBackStep) {
            this.props.onBackStep(this.getOptions());
        }
    },

    _handleSubmitStep: function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.props.onSubmitStep) {
            this.props.onSubmitStep(this.getOptions());
        }
    },

    getOptions: function () {
        return {
            includeChildren: this.refs.includeChildrenCheckbox.getChecked(),
            //includeFlux: this.refs.includeFluxCheckbox.getChecked(),
            // Generating (Re)Flux components is currently disabled because:
            // - Generating incorrect paths with our project structure
            // - Not currently used in our project
            includeFlux: false,
            componentSourcePath: this.refs.componentSourcePath.getValue()
            //includeAllReferences: this.refs.includeAllReferencesCheckbox.getChecked()
        }
    },

    getInitialState: function () {
        return {
            includeChildren: this.props.includeChildren,
            includeFlux: this.props.includeFlux,
            includeAllReferences: this.props.includeAllReferences,
            componentSourcePath: this.props.componentSourcePath
        }
    },

    getDefaultProps: function () {
        return {
            onSubmitStep: null,
            onBackStep: null
        };
    },

    componentDidMount: function () {
    },

    componentWillUnmount: function () {
    },

    render: function () {
        return (
            <div style={this.props.formStyle}>
                <table style={{width: '100%'}}>
                    <tr>
                        <td style={{width: '10%'}}></td>
                        <td>
                            <form>
                                <Input
                                    type="checkbox"
                                    ref="includeChildrenCheckbox"
                                    checked={this.state.includeChildren}
                                    onChange={this._handleIncludeChildrenChange}
                                    label="Include children into component code"/>
                                  <Input
                                    type="text"
                                    ref="componentSourcePath"
                                    label="Component source filename"
                                    value={this.state.componentSourcePath}
                                    onChange={this._handleSourcePathChange} />
                                  {/*
                                  Not currently supported for this project
                                <Input
                                    type="checkbox"
                                    ref="includeFluxCheckbox"
                                    checked={this.state.includeFlux}
                                    onChange={this._handleIncludeFluxChange}
                                    label="Include Reflux actions and store into component code"/>
                                    */}
                                {/*<Input
                                 type="checkbox"
                                 ref="includeAllReferencesCheckbox"
                                 checked={this.state.includeAllReferences}
                                 onChange={this._handleIncludeAllReferencesChange}
                                 label="Include all references of project components" />*/}
                            </form>
                        </td>
                        <td style={{width: '10%'}}></td>
                    </tr>
                    <tr>
                        <td colspan='3' style={{height: '2em'}}></td>
                    </tr>
                </table>
                <div style={{display: 'table', textAlign: 'center', width: '100%'}}>
                    <Button bsStyle='default' onClick={this._handleBackStep}>Back</Button>
                    <Button bsStyle='primary' onClick={this._handleSubmitStep}>Generate</Button>
                </div>
            </div>
        );
    }

});

module.exports = FormComponentContent;
