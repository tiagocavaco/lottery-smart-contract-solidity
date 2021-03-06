// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

contract Lottery {

    address public manager;
    address payable[] public players;

    constructor(){
        manager = msg.sender;
    }

    function enter() public payable {
        require(msg.value > .01 ether, "Amount of ether sent is not enought");

        players.push(payable(msg.sender));
    }
    
    function random() private view returns (uint){
        return uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, players)));
    }

    function pickWinner() public restricted {
        uint index = random() % players.length;
        players[index].transfer(address(this).balance);
        players = new address payable[](0);
    }

    function getPlayers() public view returns (address payable[] memory){
        return players;
    }

    modifier restricted(){
        require(msg.sender == manager, "Only manager can pick a winner");
        _;
    }
}