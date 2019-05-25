import React, { Component } from 'react';
import { Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader,
	Form, ModalBody, ModalFooter, InputGroup, InputGroupAddon, Input } from 'reactstrap';
import {Ledger} from './ledger.js';


export class LedgerButton extends Component {
	constructor(props) {
		super(props);
        this.state = {
        	activeTab: '2',
        	loading: false,
        	errorMessage: '',
        	user: localStorage.getItem('address')
        };
        this.ledger = new Ledger({testModeAllowed: false});
        this.toggle = this.toggle.bind(this);
    }

	componentDidUpdate(prevProps, prevState) {
		if (this.state.isOpen && !prevState.isOpen) {
			if (!this.state.success)
				this.tryConnect();
			if (!this.state.balance)
				this.getBalance();

		}
	}

	getBalance() {
		Meteor.call('accounts.getBalance', this.state.user, true, (error, result) => {
			if(result)
				this.setState({
					userAvailable: {
						amount:parseFloat(result.available.amount),
						denom: result.available.denom
					}})
		})
	}

	tryConnect() {
		this.ledger.getCosmosAddress().then((res) => this.setState({
			success:true,
	    }), (err) => this.setState({
    		success:false,
        	activeTab: '1'
		}));
	}

	toggle(value) {
		this.setState({isOpen: typeof value === 'boolean'? value:!this.state.isOpen})
	}

	simulate() {
		this.setState({loading: true})
		let amount = this.state.delegateAmount;
		Meteor.call('delegation.simulate', this.state.user, this.props.validatorAddress, amount, (err, res) =>{
			if (res)
				this.setState({
					gasEstimate: res,
					amount: amount,
					activeTab: '3',
					loading: false
				})
			else
				this.setState({
					loading: false,
					errorMessage: 'something went wrong'
				})
		})
	}

	sign() {
		let message = [{
            "base_req": {
                "from": this.state.user,
                "memo": "Sent via BD",
                "chain_id": Meteor.settings.public.chainId,
                "gas": this.state.gasEstimate,
                "gas_adjustment": "1.2",
                "simulate": true
            },
            "delegator_address": this.state.user,
            "validator_address": this.validatorAddress,
            "amount": {
                "denom": Meteor.settings.public.stakingDenom,
                "amount": this.state.amount
            }
		}];
		this.ledger.sign(message).then((res) => {
			console.log(res)
		}, (err) => {
			console.log(err)
		})

	}

	handleInputChange(e) {
		this.setState({[e.target.name]: e.target.value})
	}

	getActionButton() {
		if (this.state.activeTab === '1')
			return <Button color="primary"  onClick={this.tryConnect.bind(this)}>Continue</Button>
		if (this.state.activeTab === '2' && this.state.errorMessage !== '')
			return <Button color="primary"  onClick={this.simulate.bind(this)}>Retry</Button>
		if (this.state.activeTab === '2')
			return <Button color="primary"  onClick={this.simulate.bind(this)}>Next</Button>
		if (this.state.activeTab === '3' && this.state.errorMessage !== '')
			return <Button color="primary"  onClick={this.sign.bind(this)}>Retry</Button>
		if (this.state.activeTab === '3')
			return <Button color="primary"  onClick={this.sign.bind(this)}>Sign</Button>
	}

	render() {
		return (<span>
			<Button color="primary" size="sm" onClick={() => this.toggle(true)}> {this.props.buttonText} </Button>
	        <Modal isOpen={this.state.isOpen} toggle={this.toggle} className={this.props.className}>
	        	<ModalHeader toggle={this.toggle}>{this.props.title}</ModalHeader>
     			<ModalBody>
	        		<TabContent activeTab={this.state.activeTab}>
			        	<TabPane tabId="1">
		    	    		Please connect your Ledger device and open Cosmos App.
			          	</TabPane>
						<TabPane tabId="2">
			    	    	Delegate to {this.props.validatorAddress}

					     	<InputGroup>
					        	<Input name="delegateAmount" onChange={this.handleInputChange.bind(this)} placeholder="Amount" min={0} max={this.state.userAvailable?this.state.userAvailable.amount:null} type="number" step="1" />
					        	<InputGroupAddon addonType="append">{Meteor.settings.public.stakingDenom}</InputGroupAddon>
					      	</InputGroup>
					      	your available balance: {this.state.userAvailable?this.state.userAvailable.amount:''} {this.state.userAvailable?this.state.userAvailable.denom:''}
			          	</TabPane>
						<TabPane tabId="3">
			    	    	You are going to delegate {this.state.amount} to {this.props.validatorAddress} with {this.state.gasEstimate} as fee
					     	If that's correct, please click next and sign in your ledger device.
			          	</TabPane>
			        </TabContent>
         			{this.state.loading?<Spinner type="grow" color="primary" />:''}
         			<p className="error-message">{this.state.errorMessage}</p>
			    </ModalBody>
        		<ModalFooter>
        			{this.getActionButton()}
            		<Button color="secondary" onClick={this.toggle}>Cancel</Button>
          		</ModalFooter>
	        </Modal>
	        </span>
    	);
  	}
}
