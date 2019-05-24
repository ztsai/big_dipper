import React, { Component } from 'react';
import { Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import {Ledger} from './ledger.js';
import Cosmos from "@lunie/cosmos-js"

export class LedgerButton extends Component {
	constructor(props) {
        this.ledger = new Ledger({testModeAllowed: false});
        this.cosmos = Cosmos(LCD, localStorage.getItem('address'))
    }

	tryConnect() {
		this.props.ledger.getCosmosAddress().then((res) => this.setState({
			success:true
	    }), (err) => this.setState({
    		success:false
		}));
	}

	toggle(value) {
		this.setState({isOpen: value == undefined? !this.state.isOpen: value})
	}

	render() {
		return (<span>
			<Button color="primary" size="sm" onClick={() => this.toggle(true)}> {this.props.buttonText} </Button>
	        <Modal isOpen={this.state.isOpen} toggle={this.toggle} className={this.props.className}>
	          <ModalHeader toggle={this.toggle}>{this.props.title}</ModalHeader>
	          <ModalBody>
	          	Detegate
	          </ModalBody>
	          <ModalFooter>
	            <Button color="primary" onClick={this.toggle}>Do Something</Button>{' '}
	            <Button color="secondary" onClick={this.toggle}>Cancel</Button>
	          </ModalFooter>
	        </Modal>
	        </span>
    	);
  	}
}
