import React, { Component } from 'react';
import { Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import {Ledger} from './ledger.js';

class LedgerModal extends React.Component {
	constructor(props){
        super(props);
        this.state = {
        	firstConnect: true,
        	loading: false,
        	activeTab: '1'
        };
    }

	componentDidUpdate(prevProps, prevState) {
		if (this.props.isOpen && !prevProps.isOpen && !this.state.loading) {
			this.tryConnect();
		}
	}

	tryConnect() {
		let firstConnect = this.state.firstConnect;
		if (!firstConnect){
			this.setState({
				loading: true,
	    		errorMessage: '',
			})
		} else {
			this.setState({ firstConnect: false})
		}
		this.props.ledger.getCosmosAddress().then((res) => {
			this.setState({
	    		address:res.address,
	    		pubKey: res.pubKey,
	    		errorMessage: '',
    			loading: false,
    			activeTab: '2'
    		});
    		this.trySignIn();
	    }, (err) => {
	    	this.setState({
    		errorMessage: firstConnect?'':err.message,
    		loading: false,
			activeTab: '1'
		})});
	}

	trySignIn() {
		this.setState({ loading: true})
		this.props.ledger.confirmLedgerAddress().then((res) => {
			localStorage.setItem(CURRENTUSERADDR, this.state.address);
			localStorage.setItem(CURRENTUSERPK, this.state.pubKey);
			this.props.toggle();
		}, (err) => {
			this.setState({
    		errorMessage: err.message,
    		loading: false
		})})
	}

	getActionButton() {
		if (this.state.activeTab === '1')
			return <Button color="primary"  onClick={this.tryConnect.bind(this)}>Continue</Button>
		if (this.state.activeTab === '2' && this.state.errorMessage !== '')
			return <Button color="primary"  onClick={this.trySignIn.bind(this)}>Retry</Button>
	}

	render() {
		return (
			<Modal isOpen={this.props.isOpen} toggle={this.props.toggle} className="ledger-sign-in">
         		<ModalHeader toggle={this.props.toggle}>Sign In With Ledger</ModalHeader>
         		<ModalBody>
	        		<TabContent activeTab={this.state.activeTab}>
			        	<TabPane tabId="1">
		    	    		Please connect your Ledger device and open Cosmos App.
			          	</TabPane>
						<TabPane tabId="2">
			    	    	To log in as {this.state.address} please accept in your Ledger device.
			          	</TabPane>
			        </TabContent>
         			{this.state.loading?<Spinner type="grow" color="primary" />:''}
         			<p className="error-message">{this.state.errorMessage}</p>
			    </ModalBody>
        		<ModalFooter>
        			{this.getActionButton()}
            		<Button color="secondary" onClick={this.props.toggle}>Cancel</Button>
          		</ModalFooter>
        	</Modal>
    	);
  	}
}

export default LedgerModal;