'use strict'
var ravencoin = require('ravencoinjs-lib');

var decodeFormat = function(tx){
    var result = {
        txid: tx.getId(),
        version: tx.version,
        locktime: tx.locktime,
        size: tx.byteLength(),
        vsize: tx.virtualSize(),
    };
    return result;
}

var decodeInput = function(tx){
    var result = tx.ins.map(function(input, n){
        var vin = {
            txid: input.hash.reverse().toString('hex'),
            n : input.index,
            script: ravencoin.script.toASM(input.script),
            sequence: input.sequence,
        }
        return vin
    })
    return result
}

var decodeOutput = function(tx, network){

    var format = function(out, n, network){
        var vout = {
            satoshi: out.value,
            value: (1e-8 * out.value).toFixed(8),
            n: n,
            scriptPubKey: {
                asm: ravencoin.script.toASM(out.script),
                hex: out.script.toString('hex'),
                type: ravencoin.script.classifyOutput(out.script),
                addresses: [],
            },
        };
        switch(vout.scriptPubKey.type){
        case 'pubkeyhash':
        case 'scripthash':
            vout.scriptPubKey.addresses.push(ravencoin.address.fromOutputScript(out.script, network));
            break;
        case 'witnesspubkeyhash': // NATIVE SEGWIT
            break;
        case 'pubkey': // There really is no address
            var pubKeyBuffer = ravencoin.script.pubKey.output.decode(out.script);
            vout.scriptPubKey.addresses.push(ravencoin.ECPair.fromPublicKeyBuffer(pubKeyBuffer, network).getAddress());
            break;
        case 'nulldata': // OP_RETURN
            break;
        default :
            break;
        }
        return vout
    }

    var result = tx.outs.map(function(out, n){
        return format(out, n, network);
    })
    return result
}

var TxDecoder = module.exports = function(rawtx, network){
    this.network = network;
    this.tx = ravencoin.Transaction.fromHex(rawtx);
    this.format = decodeFormat(this.tx);
    this.inputs = decodeInput(this.tx);
    this.outputs = decodeOutput(this.tx, this.network);
}
TxDecoder.prototype.toObject = function(){
    return {
        format : this.format,
        inputs : this.inputs,
        outputs : this.outputs,
    }
}

TxDecoder.prototype.decode = function(){
    var result = {}
    var self = this;
    Object.keys(self.format).forEach(function(key){
        result[key] = self.format[key]
    })
    result.outputs = self.outputs
    return result;
}
