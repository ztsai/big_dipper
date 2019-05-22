import Cosmos from "@lunie/cosmos-js"
import React, { Component } from 'react';
import { Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader,
	Form, ModalBody, ModalFooter, InputGroup, InputGroupAddon, Input } from 'reactstrap';
import {Ledger, toPubKey, createSkeleton, createDelegate, applyGas, getBytesToSign, applySignature} from './ledger.js';

export class LedgerButton extends Component {
	constructor(props) {
		super(props);
        this.state = {
        	activeTab: '2',
        	loading: true,
        	errorMessage: '',
        	user: localStorage.getItem(CURRENTUSERADDR)
        };
        this.ledger = new Ledger({testModeAllowed: false});
        this.toggle = this.toggle.bind(this);
    }

	componentDidUpdate(prevProps, prevState) {
		if (this.state.isOpen && !prevState.isOpen) {
			if (!this.state.success)
				this.tryConnect();
			if (!this.state.currentUser)
				this.getBalance();

		}
	}

	getBalance() {
		Meteor.call('accounts.getAccountDetail', this.state.user, (error, result) => {
			if(result) {
				let baseAccount = result.BaseVestingAccount.BaseAccount;
				let coin = baseAccount.coins[0]
				this.setState({
					loading:false,
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

	isLoading() {
		return this.state.loading
	}

	getTxContext() {
		return {
			chainId: Meteor.settings.public.chainId,
			bech32: this.state.user,
            accountNumber: this.state.currentUser.accountNumber,
			sequence: this.state.currentUser.sequence,
			denom: Meteor.settings.public.stakingDenom,
	        pk: localStorage.getItem(CURRENTUSERPK),
	        path: [44, 118, 0, 0, 0],
		}
	}

	simulate() {
		if (this.state.simulating)
			return
		this.setState({loading: true, simulating: true})
		this.delegateMsg = createDelegate(
			this.getTxContext(),
			this.props.validatorAddress,
			this.state.delegateAmount,
			"Sent via Big Dipper")
		Meteor.call('delegation.simulate', this.state.user, this.props.validatorAddress, amount, (err, res) =>{
			if (res){
				this.setState({
					gasEstimate: res,
					amount: amount,
					activeTab: '3',
					loading: false,
					simulating: false
				})
				applyGas(this.delegateMsg, res);
			}
			else
				this.setState({
					loading: false,
					simulating: false,
					errorMessage: 'something went wrong'
				})
		})
	}
	sign() {
		if (this.state.signing)
			return
		this.setState({loading: true, signing: true})
		const txContext = this.getTxContext();
	    const bytesToSign = getBytesToSign(this.delegateMsg, txContext);
	    this.ledger.sign(bytesToSign).then((sig) => {
    		applySignature(this.delegateMsg, txContext, sig);
    		Meteor.call('transaction.submit', this.delegateMsg, (err, res) => {
				if (err) {
					this.setState({
						loading: false,
						signing: false,
						errorMessage: 'something went wrong'
					})
				} if (res) {
					this.setState({
						loading: false,
						signing: false,
					})
				}
			})
	    })
	}

	handleInputChange(e) {
		this.setState({[e.target.name]: e.target.value})
	}

	getActionButton() {
		if (this.state.activeTab === '1')
			return <Button color="primary"  onClick={this.tryConnect.bind(this)}>Continue</Button>
		if (this.state.activeTab === '2')
			return <Button color="primary"  disabled={this.state.simulating} onClick={this.simulate.bind(this)}>
				{(this.state.errorMessage !== '')?'Retry':'Next'}
			</Button>
		if (this.state.activeTab === '3')
			return <Button color="primary"  disabled={this.state.signing} onClick={this.sign.bind(this)}>
				{(this.state.errorMessage !== '')?'Retry':'Sign'}
			</Button>
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
