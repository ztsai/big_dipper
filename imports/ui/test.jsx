import React, { Component } from 'react';
import {Ledger, MyLedger} from '/imports/ui/ledger.js';

export default class Test extends Component{
	constructor(props){
        super(props);
        this.state = {};
    }

    getversion() {
		this.ledger.getVersion((res) => {
    		this.setState({version: res});
        });
    }

    componentDidMount(){
	    this.ledger = new MyLedger({testModeAllowed: true});
	    this.ledger.open().then((res) => {
	    			console.log(this.ledger);
	                console.log(res);
	                window.ledger = this.ledger;
	                this.getversion();
	            });
	    this.ledger2 = new Ledger({testModeAllowed: true});
	    this.ledger2.connect().then((res) => {
	    			console.log(this.ledger2);
	                console.log(res);
	                window.ledger2 = this.ledger2;
	            });
	    //let ledgernode = Meteor.call('ledger.connect');
	}

	render() {
		return <div>
			whatever
			{this.state.version}
			<button onClick={this.getversion.bind(this)}> retry </button>
		</div>
	}
}
