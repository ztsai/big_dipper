import React, { Component } from 'react';
import { Badge, Row, Col } from 'reactstrap';
import ChainStatus from './ChainStatusContainer.js';
import Consensus from './ConsensusContainer.js';
import TopValidators from './TopValidatorsContainer.js';
import Chart from './ChartContainer.js';
import ChainStates from '../components/ChainStatesContainer.js'
import { Helmet } from "react-helmet";
import Ledger from '/imports/ui/ledger.js';

export default class Home extends Component{
    constructor(props){
        super(props);
    }

    componentDidMount(){
        let ledger = new Ledger({testModeAllowed: true});
        ledger.connect().then((res) => {
            console.log(res);
        });
        let ledgernode = Meteor.call('ledger.connect');
    }

    render() {
        return <div id="home">
            <Helmet>
                <title>The Big Dipper | Cosmos Explorer by Forbole</title>
                <meta name="description" content="Cosmos is a decentralized network of independent parallel blockchains, each powered by BFT consensus algorithms like Tendermint consensus." />
            </Helmet>
            <Row>
                <Col md={3} xs={12}><h1>{Meteor.settings.public.chainName}</h1></Col>
                <Col md={9} xs={12} className="text-md-right"><ChainStates /></Col>
            </Row>
            <Consensus />
            <ChainStatus />
            <Row>
                <Col md={6}>
                    <TopValidators />
                </Col>
                <Col md={6}>
                    <Chart />
                </Col>
            </Row>
        </div>
    }

}