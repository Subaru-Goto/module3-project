import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createMint, createRevokeInstruction, getOrCreateAssociatedTokenAccount, mintTo, transfer } from "@solana/spl-token";
import { createCreateMetadataAccountV2Instruction, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import * as fs from "fs";
import * as anchor from '@project-serum/anchor';

function readWalletKey (privateKey) {
    //const fs = require("fs");
    const loaded = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(privateKey).toString())));
    return loaded;
  }

(async () => {

    // Connect to cluster and generate two new Keypairs
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    // Read private key from local config .id file and generate keypair
    const myKeyPair = readWalletKey('/Users/gotousubaru/.config/solana/id.json', 'utf8');

    // Airdrop SOL into your from wallet for rent
    const fromAirdropSignature = await connection.requestAirdrop(myKeyPair.publicKey, LAMPORTS_PER_SOL);
    // Wait for airdrop confirmation
    await connection.confirmTransaction(fromAirdropSignature, { commitment: "confirmed" });

    
    // Create new token mint and get the token account
    //If the token account does not exist, create it, connection /payer/mint auth,freeze, decimal
    const mint = await createMint(connection, myKeyPair, myKeyPair.publicKey, null, 9);
    const myTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        myKeyPair, //payer
        mint, // mint account
        myKeyPair.publicKey // owner
)
    //Step 4: Mint a new token to the from account
    let signature = await mintTo(
        connection,
        myKeyPair, // payer
        mint, // mint account
        myTokenAccount.address, // who we are minting to
        myKeyPair.publicKey, //authority
        4000000000, // amount
        []
    );
    console.log('mint tx:', signature);

    // Step 5 Add meta data to SPL token
    // Reference https://www.youtube.com/watch?v=DQbt0-riooo
    const seed1 = Buffer.from(anchor.utils.bytes.utf8.encode("metadata"));
    const seed2 = Buffer.from(PROGRAM_ID.toBytes());
    const seed3 = Buffer.from(mint.toBytes());
    const [metadataPDA, _bump] = PublicKey.findProgramAddressSync([seed1, seed2, seed3], PROGRAM_ID);
    //const tokenmeta = await Metadata.load(connection, tokenmetaPubkey);
    const accounts = {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: myKeyPair.publicKey,
        payer: myKeyPair.publicKey,
        updateAuthority:myKeyPair.publicKey
        }
    
    const dataV2 = {
        name: "Challenge Token",
        symbol:"CLT",
        uri: "PLESE ENTER YOUR URL",
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
        }
    
    const args = {
        createMetadataAccountArgsV2: {
            data: dataV2,
            isMutable: true,
        }
        
    }
    // Add meta data
    const ix = createCreateMetadataAccountV2Instruction(accounts, args);
    // Make a transaction with metadata
    const tx = new Transaction();
    tx.add(ix);
    const transactionId = sendAndConfirmTransaction(connection, tx, [myKeyPair]);
    console.log("transactionId", transactionId);

})();