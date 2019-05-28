import Cosmos from "@lunie/cosmos-js"
import React, { Component } from 'react';
import { Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader,
	Form, ModalBody, ModalFooter, InputGroup, InputGroupAddon, Input } from 'reactstrap';
import {Ledger, toPubKey} from './ledger.js';


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
		Meteor.call('accounts.getAccountDetail', this.state.user, (error, result) => {
			if(result) {
				let baseAccount = result.BaseVestingAccount.BaseAccount;
				let coin = baseAccount.coins[0]
				this.setState({
					currentUser: {
						accountNumber: baseAccount.account_number,
						sequence: baseAccount.sequence,
						availableAmount:parseFloat(coin.amount),
						denom: coin.denom
					}})
			}
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
		let message = {
            "gas": this.state.gasEstimate,
            "delegatorAddress": this.state.user,
            "validatorAddress": this.props.validatorAddress,
            "denom": Meteor.settings.public.stakingDenom,
            "amount": this.state.amount,
            "accountNumber": this.state.currentUser.accountNumber,
			"sequence": this.state.currentUser.sequence,
			"pubKey": localStorage.getItem('pubKey')
		};
		this.ledger.signDelegationMessage(message).then((data) => {
			/*let data = {
				delegatorAddress: message.delegator_address,
				validatorAddress: message.validator_address,
				denom: message.denom,
				amount: message.amount,
				gas: message.gas,
            	accountNumber: this.state.currentUser.accountNumber,
				sequence: this.state.currentUser.sequence,
				pubKey: localStorage.getItem('pubKey'),
				signature: Buffer.from(res).toString('base64'),
			}*/
			Meteor.call('delegation.send', data, (err, res) => {
				if (err) {
					console.log(err);
				}
			})
		}, (err) => {
			console.log(err)
		});
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
					        	<Input name="delegateAmount" onChange={this.handleInputChange.bind(this)} placeholder="Amount" min={0} max={this.state.currentUser?this.state.currentUser.availableAmount:null} type="number" step="1" />
					        	<InputGroupAddon addonType="append">{Meteor.settings.public.stakingDenom}</InputGroupAddon>
					      	</InputGroup>
					      	your available balance: {this.state.currentUser?this.state.currentUser.availableAmount:''} {this.state.currentUser?this.state.currentUser.denom:''}
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
