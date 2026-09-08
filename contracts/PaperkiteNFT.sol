// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC721Min.sol";
import "./Base64.sol";

interface IPaperkiteRenderer {
    function render(uint256 seed) external pure returns (string memory);
    function traits(uint256 seed) external pure returns (string memory);
}

/// @notice Each token's picture is drawn live by the renderer contract, from
/// the token id itself. Payment on mint goes straight to `payout`, no
/// withdraw step, nothing held in this contract.
contract PaperkiteNFT is ERC721Min {
    IPaperkiteRenderer public immutable renderer;
    address payable public immutable payout;
    address public owner;

    uint256 public price;
    uint256 public immutable maxSupply;
    uint256 public nextId = 1;
    uint96 public royaltyBps = 500; // 5%

    event PriceChanged(uint256 newPrice);
    event OwnerChanged(address newOwner);
    event RoyaltyChanged(uint96 newBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(
        address rendererAddress,
        address payable payoutAddress,
        uint256 initialPrice,
        uint256 maxSupply_
    ) ERC721Min("Paperkite", "KITE") {
        require(rendererAddress != address(0), "zero renderer");
        require(payoutAddress != address(0), "zero payout");
        require(maxSupply_ > 0, "zero supply");
        renderer = IPaperkiteRenderer(rendererAddress);
        payout = payoutAddress;
        owner = payoutAddress;
        price = initialPrice;
        maxSupply = maxSupply_;
    }

    function mint() external payable {
        require(nextId <= maxSupply, "sold out");
        require(msg.value == price, "wrong payment");
        uint256 tokenId = nextId;
        nextId += 1;
        _mint(msg.sender, tokenId);
        (bool ok, ) = payout.call{value: msg.value}("");
        require(ok, "payout failed");
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        price = newPrice;
        emit PriceChanged(newPrice);
    }

    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }

    function setRoyalty(uint96 newBps) external onlyOwner {
        require(newBps <= 1000, "royalty too high");
        royaltyBps = newBps;
        emit RoyaltyChanged(newBps);
    }

    function totalSupply() external view returns (uint256) {
        return nextId - 1;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_owners[tokenId] != address(0), "nonexistent token");
        string memory svg = renderer.render(tokenId);
        string memory t = renderer.traits(tokenId);
        string memory json = string.concat(
            '{"name":"Paperkite #', _u(tokenId),
            '","description":"A layered paper landscape, drawn on chain by the seed of its own token id. Nothing is stored off chain.",',
            '"attributes":[{"trait_type":"traits","value":"', t, '"}],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 amount) {
        return (payout, (salePrice * royaltyBps) / 10000);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0x2a55205a || super.supportsInterface(interfaceId);
    }

    function _u(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 len;
        for (uint256 t = v; t != 0; t /= 10) len++;
        bytes memory b = new bytes(len);
        while (v != 0) { b[--len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}
