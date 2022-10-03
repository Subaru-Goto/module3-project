import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createMint, createRevokeInstruction, getOrCreateAssociatedTokenAccount, mintTo, transfer } from "@solana/spl-token";
import { createCreateMetadataAccountV2Instruction, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from '@project-serum/anchor';


(async () => {
    // Step 1: Connect to cluster and generate two new Keypairs
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    const fromWallet = Keypair.generate();
    // Generate public key
    const toWallet = new PublicKey("5vjYTJQ5kGnHzVMnWGSieiLzBXznMsaaYFp65oHArMYa");
    
    // Step 2: Airdrop SOL into your from wallet
    const fromAirdropSignature = await connection.requestAirdrop(fromWallet.publicKey, LAMPORTS_PER_SOL);
    // Wait for airdrop confirmation
    await connection.confirmTransaction(fromAirdropSignature, { commitment: "confirmed" });

    
    // Step 3: Create new token mint and get the token account of the fromWallet address
    //If the token account does not exist, create it, connection /payer/mint auth,freeze, decimal
    const mint = await createMint(connection, fromWallet, fromWallet.publicKey, null, 9);
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        fromWallet, //payer
        mint, // mint account
        fromWallet.publicKey // owner
)
    //Step 4: Mint a new token to the from account
    let signature = await mintTo(
        connection,
        fromWallet, // payer
        mint, // mint account
        fromTokenAccount.address, // who we are minting to
        fromWallet.publicKey, //authority
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
        mintAuthority: fromWallet.publicKey,
        payer: fromWallet,
        updateAuthority:fromWallet.publicKey
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
    const transactionId = sendAndConfirmTransaction(connection, tx, [fromWallet]);
    console.log("transactionId", transactionId);
    /*

    //Step 6: Get the token account of the to-wallet address and if it does not exist, create it
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toWallet);

    //Step 7: Transfer the new token to the to-wallet's token account that was just created
    // Transfer the new token to the "toTokenAccount" we just created
    signature = await transfer(
        connection,
        fromWallet,//payer
        fromTokenAccount.address, //from token account wallet
        toTokenAccount.address, // to token account wallet
        fromWallet.publicKey, // signature
        1000000000, // amount
        []
        );
    console.log('transfer tx:', signature);
*/
})();