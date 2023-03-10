import { describe, it, expect } from 'vitest';

import * as types from './types';

import * as didJwtKit from '.';

type MyCredential = {
  name: string;
};

type Revocable = {
  appIndex: number;
};

describe('did-jwt-toolkit', () => {
  it('getDIDKeyDriver should work', () => {
    expect(didJwtKit.getDIDKeyDriver('EdDSA')).toBeDefined();
  });

  it('createJWT should work', async () => {
    const driver = didJwtKit.getDIDKeyDriver('EdDSA');

    const issuerKeyPair = driver.generateKeyPair();
    const audienceKeyPair = driver.generateKeyPair();

    const issuer = driver.issuerFromKeyPair(issuerKeyPair);
    const audienceDID = driver.didFromPublicKey(audienceKeyPair.publicKey);

    type MyPayload = {
      name: string;
    };

    const payload: didJwtKit.JWTPayload<MyPayload> = {
      aud: audienceDID,
      name: 'aaa',
    };

    const jwt = await didJwtKit.createJWT(payload, issuer);

    expect(typeof jwt).toEqual('string');
  });

  it('verifyJWT should work', async () => {
    const driver = didJwtKit.getDIDKeyDriver('EdDSA');

    const issuerKeyPair = driver.generateKeyPair();
    const audienceKeyPair = driver.generateKeyPair();

    const issuer = driver.issuerFromKeyPair(issuerKeyPair);
    const audienceDID = driver.didFromPublicKey(audienceKeyPair.publicKey);

    const payload: didJwtKit.JWTPayload<MyCredential> = {
      aud: audienceDID,
      name: 'My name',
    };

    const jwt = await didJwtKit.createJWT(payload, issuer);

    const resolver = new didJwtKit.Resolver(driver.getResolverRegistry());

    const verifiedJWT = await didJwtKit.verifyJWT<MyCredential>(jwt, resolver, {
      audience: audienceDID,
    });

    expect(verifiedJWT).toBeDefined();
    expect(verifiedJWT.payload.name).toEqual('My name');
  });

  it('createCredentialJWT should work', async () => {
    const driver = didJwtKit.getDIDKeyDriver('EdDSA');

    const issuerKeyPair = driver.generateKeyPair();
    const holderKeyPair = driver.generateKeyPair();

    const issuer = driver.issuerFromKeyPair(issuerKeyPair);
    const holderDID = driver.didFromPublicKey(holderKeyPair.publicKey);

    const payload: didJwtKit.CredentialJWTPayload<MyCredential> = {
      sub: holderDID,
      vc: {
        '@context': [didJwtKit.DEFAULT_CONTEXT],
        type: [didJwtKit.DEFAULT_VC_TYPE],
        credentialSubject: {
          name: 'aaa',
        },
      },
    };

    const vcJWT = await didJwtKit.createCredentialJWT(payload, issuer);

    expect(typeof vcJWT).toEqual('string');
  });

  it('verifiedCredentialJWT should work', async () => {
    const driver = didJwtKit.getDIDKeyDriver('EdDSA');

    const issuerKeyPair = driver.generateKeyPair();
    const holderKeyPair = driver.generateKeyPair();

    const issuer = driver.issuerFromKeyPair(issuerKeyPair);
    const holderDID = driver.didFromPublicKey(holderKeyPair.publicKey);

    const payload: didJwtKit.CredentialJWTPayload<MyCredential & Revocable> = {
      sub: holderDID,
      vc: {
        '@context': [didJwtKit.DEFAULT_CONTEXT],
        type: [didJwtKit.DEFAULT_VC_TYPE],
        credentialSubject: {
          name: 'aaa',
          appIndex: 1,
        },
      },
    };

    const vcJWT = await didJwtKit.createCredentialJWT(payload, issuer);
    const resolver = new didJwtKit.Resolver(driver.getResolverRegistry());

    const verifiedVC = await didJwtKit.verifyCredentialJWT<
      MyCredential & Revocable
    >(vcJWT, resolver);

    console.log(JSON.stringify(verifiedVC, undefined, 2));

    expect(verifiedVC).toBeDefined();
    expect(verifiedVC.verifiableCredential.credentialSubject.name).toEqual(
      'aaa'
    );
    expect(verifiedVC.verifiableCredential.credentialSubject.appIndex).toEqual(
      1
    );
    expect(verifiedVC.payload.vc.credentialSubject.name).toEqual('aaa');
    expect(verifiedVC.payload.vc.credentialSubject.appIndex).toEqual(1);
  });

  it('createPresentationJWT should work', async () => {
    const driver = didJwtKit.getDIDKeyDriver('EdDSA');

    const issuerKeyPair = driver.generateKeyPair();
    const holderKeyPair = driver.generateKeyPair();
    const verifierKeyPair = driver.generateKeyPair();

    const issuer = driver.issuerFromKeyPair(issuerKeyPair);
    const holder = driver.issuerFromKeyPair(holderKeyPair);
    const verifierDID = driver.didFromPublicKey(verifierKeyPair.publicKey);

    const vcPayload: didJwtKit.CredentialJWTPayload<MyCredential> = {
      sub: holder.did,
      vc: {
        '@context': [didJwtKit.DEFAULT_CONTEXT],
        type: [didJwtKit.DEFAULT_VC_TYPE],
        credentialSubject: {
          name: 'aaa',
        },
      },
    };

    const vcJWT = await didJwtKit.createCredentialJWT(vcPayload, issuer);

    const vpPayload: didJwtKit.PresentationJWTPayload = {
      aud: verifierDID,
      vp: {
        '@context': [didJwtKit.DEFAULT_CONTEXT],
        type: [didJwtKit.DEFAULT_VP_TYPE],
        verifiableCredential: [vcJWT],
      },
    };

    const vpJWT = await didJwtKit.createPresentationJWT(vpPayload, holder);

    expect(typeof vpJWT).toEqual('string');
  });

  it('verifyPresentationJWT should work', async () => {
    const driver = didJwtKit.getDIDKeyDriver('EdDSA');

    const issuerKeyPair = driver.generateKeyPair();
    const holderKeyPair = driver.generateKeyPair();
    const verifierKeyPair = driver.generateKeyPair();

    const issuer = driver.issuerFromKeyPair(issuerKeyPair);
    const holder = driver.issuerFromKeyPair(holderKeyPair);
    const verifierDID = driver.didFromPublicKey(verifierKeyPair.publicKey);

    const vcPayload: didJwtKit.CredentialJWTPayload<MyCredential & Revocable> =
      {
        sub: holder.did,
        vc: {
          '@context': [didJwtKit.DEFAULT_CONTEXT],
          type: [didJwtKit.DEFAULT_VC_TYPE],
          credentialSubject: {
            name: 'aaa',
            appIndex: 1,
          },
        },
      };

    const vcJWT = await didJwtKit.createCredentialJWT(vcPayload, issuer);

    const vpPayload: didJwtKit.PresentationJWTPayload = {
      aud: verifierDID,
      vp: {
        '@context': [didJwtKit.DEFAULT_CONTEXT],
        type: [didJwtKit.DEFAULT_VP_TYPE],
        verifiableCredential: [vcJWT],
      },
    };

    const vpJWT = await didJwtKit.createPresentationJWT(vpPayload, holder);

    const resolver = new didJwtKit.Resolver(driver.getResolverRegistry());

    const verifiedVP = await didJwtKit.verifyPresentationJWT(vpJWT, resolver, {
      audience: verifierDID,
    });
    const typedVC = didJwtKit.typedCredential<MyCredential & Revocable>(
      verifiedVP.verifiablePresentation.verifiableCredential[0]
    );
    console.log(typedVC);

    expect(verifiedVP).toBeDefined();
    expect(typedVC.credentialSubject.name).toEqual('aaa');
    expect(typedVC.credentialSubject.appIndex).toEqual(1);
  });

  it('typedCredential should work', async () => {
    const vc: types.VerifiableCredential = {
      '@context': [didJwtKit.DEFAULT_CONTEXT],
      type: [didJwtKit.DEFAULT_VC_TYPE],
      credentialSubject: {
        name: 'aaa',
        appIndex: 1,
      },
      issuer: {
        id: 'did:key:abc',
      },
      issuanceDate: '1234/12/31T12:34:56',
      proof: {
        type: 'hoge',
      },
    };

    const typedVC = didJwtKit.typedCredential<MyCredential & Revocable>(vc);

    expect(typedVC.credentialSubject.name).toEqual('aaa');
    expect(typedVC.credentialSubject.appIndex).toEqual(1);
  });
});
