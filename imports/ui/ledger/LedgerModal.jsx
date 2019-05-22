import React, { Component } from 'react';
import { Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import {Ledger} from './ledger.js';

class LedgerModal extends React.Component {
	constructor(props){
        super(props);
        this.state = {
        	activeTab: '1'
        };
    }

	componentDidUpdate(prevProps, prevState) {
		if (this.props.isOpen && !prevProps.isOpen && !this.state.version) {
			this.tryConnect();
		}
	}

	tryConnect() {
		this.setState({ activeTab: '0'})
		this.props.ledger.getCosmosAppVersion().then((res) => this.setState({
	    		version:res,
	    		errorMessage: '',
    			activeTab: '2'
	    }), (err) => this.setState({
    		errorMessage: 'there is err',
			activeTab: '1'
		}));
	}

	tryGetAddress() {
		this.setState({ activeTab: '0'})
		this.props.ledger.getCosmosAddress().then((res) => this.setState({
    		address:res,
    		errorMessage: '',
			activeTab: '3'
	    }), (err) => this.setState({
    		errorMessage: 'there is err',
			activeTab: '2'
		}))
	}


	trySignIn() {
		this.setState({ activeTab: '4'})
		this.props.ledger.confirmLedgerAddress().then((res) => {
			localStorage.setItem('address', this.state.address);
			this.props.toggle();
		}, (err) => this.setState({
    		errorMessage: 'there is err',
			activeTab: '3'
		}))
	}

	getOnclick() {
		switch (this.state.activeTab) {
			case '1':
				return this.tryConnect.bind(this);
			case '2':
				return this.tryGetAddress.bind(this);
			case '3':
				return this.trySignIn.bind(this);
			default:
				return null
		}
	}

	getButtonMessage() {
		switch (this.state.activeTab) {
			case '2':
				return 'Sign In';
			default:
				return 'Next';
		}
		return '';
	}

	render() {
		return (
			<Modal isOpen={this.props.isOpen} toggle={this.props.toggle} className="ledger-sign-in">
         		<ModalHeader toggle={this.props.toggle}>Sign In With Ledger</ModalHeader>
         		<ModalBody>
         			<p>{this.state.errorMessage}</p>
	        		<TabContent activeTab={this.state.activeTab}>
	        			<TabPane tabId="0">
	        				<Spinner type="grow" color="primary" />
	        			</TabPane>
			        	<TabPane tabId="1">
		    	    		Please connect your Ledger device and open Cosmos App.
			          	</TabPane>
						<TabPane tabId="2">
			    	    	cosmos version {this.state.version}
			          	</TabPane>
						<TabPane tabId="3">
			    	    	your address is {this.state.address}
			          	</TabPane>
						<TabPane tabId="4">
			    	    	Please accept in your Ledger device.
			          	</TabPane>
			        </TabContent>
			    </ModalBody>
        		<ModalFooter>
            		<Button color="primary"  onClick={this.getOnclick()}>{this.getButtonMessage()}</Button>
            		<Button color="secondary" onClick={this.props.toggle}>Cancel</Button>
          		</ModalFooter>
        	</Modal>
    	);
  	}
}

export default LedgerModal;